import { resolve } from "node:path";
import type { TicketClaims } from "@play-together/contracts";
import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import type { ResolvedGameModule } from "../modules/module-store.js";
import { InMemoryRoomCoordinator } from "./in-memory-room-coordinator.js";
import { RoomSession } from "./room-session.js";

class FakeSocket {
  readonly OPEN = 1;
  readyState = 1;
  bufferedAmount = 0;
  readonly messages: unknown[] = [];

  send(encoded: string): void {
    this.messages.push(JSON.parse(encoded));
  }

  close(): void {
    this.readyState = 3;
  }
}

const moduleFixture: ResolvedGameModule = {
  modulePath: "/unused-by-test-worker.mjs",
  manifest: {
    schemaVersion: 1,
    protocolVersion: 1,
    game: {
      id: "distributed-test",
      version: "1.0.0",
      title: "Distributed Test",
      description: "Cross-instance room relay test",
      minPlayers: 1,
      maxPlayers: 4,
      tickRate: 60,
      snapshotRate: 20,
    },
    modes: ["shared-screen", "handheld"],
    controller: {
      supportsRemote: true,
      supportsHandheld: true,
      preferredOrientation: "adaptive",
    },
    entries: {
      display: { url: "./display.js", sha256: "a".repeat(64) },
      server: { url: "./server.js", sha256: "b".repeat(64) },
    },
    capabilities: { touch: true, keyboard: true, gamepad: true, motion: false },
  },
};

function claims(sub: string, role: "controller" | "display"): TicketClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "play-together",
    aud: "play-together-realtime",
    sub,
    roomId: "room-distributed",
    roomCode: "ROOM42",
    role,
    mode: "remote",
    gameId: "distributed-test",
    gameVersion: "1.0.0",
    manifestUrl: "https://games.test/distributed-test/1.0.0/manifest.json",
    manifestSha256: "c".repeat(64),
    iat: now,
    exp: now + 300,
    jti: `ticket-${sub}-${role}`,
  };
}

function socket(): { raw: FakeSocket; websocket: WebSocket } {
  const raw = new FakeSocket();
  return { raw, websocket: raw as unknown as WebSocket };
}

function latestGuestX(messages: unknown[]): number | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as {
      type?: string;
      state?: { players?: Array<{ id: string; x: number }> };
    };
    if (message.type !== "snapshot") continue;
    const guest = message.state?.players?.find((player) => player.id === "guest");
    if (guest) return guest.x;
  }
  return null;
}

describe("RoomSession distributed coordination", () => {
  it("relays a controller input on replica B into the display authority on replica A", async () => {
    const coordinator = new InMemoryRoomCoordinator();
    const workerPath = resolve(import.meta.dirname, "../../runtime/room-session-test-worker.mjs");
    const displaySession = new RoomSession(
      claims("host", "display"),
      moduleFixture,
      () => {},
      workerPath,
    );
    const controllerSession = new RoomSession(
      claims("guest", "controller"),
      moduleFixture,
      () => {},
      workerPath,
    );
    const displayHandle = await coordinator.attach(displaySession.key, {
      onPresence: (players) => displaySession.syncDistributedPresence(players),
      onInput: (input) => displaySession.handleDistributedInput(input),
      onSnapshot: (snapshot) => displaySession.handleDistributedSnapshot(snapshot),
    });
    const controllerHandle = await coordinator.attach(controllerSession.key, {
      onPresence: (players) => controllerSession.syncDistributedPresence(players),
      onInput: (input) => controllerSession.handleDistributedInput(input),
      onSnapshot: (snapshot) => controllerSession.handleDistributedSnapshot(snapshot),
    });
    displaySession.attachCoordinator(displayHandle);
    controllerSession.attachCoordinator(controllerHandle);
    await displayHandle.start();
    await controllerHandle.start();

    const display = socket();
    const controller = socket();
    await displaySession.add(display.websocket, claims("host", "display"));
    const controllerId = await controllerSession.add(
      controller.websocket,
      claims("guest", "controller"),
    );

    await expect.poll(() => latestGuestX(display.raw.messages), { timeout: 2_000 }).toBe(0);
    controllerSession.handle(controllerId, {
      type: "input",
      seq: 1,
      sentAt: Date.now(),
      payload: { steer: -1 },
    });
    await expect.poll(() => latestGuestX(display.raw.messages), { timeout: 2_000 }).toBe(-1);

    displaySession.close();
    controllerSession.close();
    await coordinator.close();
  });
});
