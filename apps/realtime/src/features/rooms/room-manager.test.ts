import { resolve } from "node:path";
import type { TicketClaims } from "@play-together/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import type { GameModuleStore } from "../modules/module-store.js";
import { RealtimeMetrics } from "../observability/realtime-metrics.js";
import type { RoomCoordinator } from "./room-coordinator.js";
import { RoomManager } from "./room-manager.js";

class FakeSocket {
  readonly OPEN = 1;
  readyState = 1;
  bufferedAmount = 0;
  readonly messages: Array<{ type: string; code?: string; state?: unknown }> = [];
  send(encoded: string) {
    this.messages.push(JSON.parse(encoded));
  }
  close() {
    this.readyState = 3;
  }
}

const claims: TicketClaims = {
  iss: "play-together",
  aud: "play-together-realtime",
  sub: "player-1",
  roomId: "room-recovery",
  roomCode: "ROOM42",
  role: "controller",
  mode: "remote",
  gameId: "recovery-test",
  gameVersion: "1.0.0",
  manifestUrl: "https://games.test/recovery-test/1.0.0/manifest.json",
  manifestSha256: "a".repeat(64),
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
  jti: "test-ticket",
};

const managers: RoomManager[] = [];
function manager(coordinator: RoomCoordinator | null = null) {
  const metrics = new RealtimeMetrics();
  const store = {
    resolve: async () => ({
      modulePath: "/unused-by-test-worker.mjs",
      manifest: { game: { tickRate: 60, snapshotRate: 20 } },
    }),
  } as unknown as GameModuleStore;
  const rooms = new RoomManager(
    store,
    60_000,
    resolve(import.meta.dirname, "../../runtime/room-session-test-worker.mjs"),
    coordinator,
    metrics,
  );
  managers.push(rooms);
  return { rooms, metrics };
}

function counters(rooms: RoomManager, metrics: RealtimeMetrics) {
  return metrics.snapshot({
    rooms: rooms.size,
    connections: rooms.connectionCount,
    blockedReleases: 0,
  }).counters;
}

afterEach(() => {
  for (const rooms of managers.splice(0)) rooms.closeAll();
});

describe("RoomManager fatal recovery", () => {
  it("does not retain a controller that disconnected while its worker was starting", async () => {
    const { rooms } = manager();
    const socket = new FakeSocket();
    const connecting = rooms.add(socket as unknown as WebSocket, claims);
    socket.close();
    await expect(connecting).rejects.toThrow("Connection closed");
    expect(rooms.connectionCount).toBe(0);
  });

  it.each(["disconnect", "failure"])("cleans pending coordination on %s", async (reason) => {
    let finish!: () => void;
    let fail!: (error: Error) => void;
    const registration = new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    const handle = {
      instanceId: "test",
      start: async () => {},
      register: vi.fn(() => registration),
      unregister: vi.fn(async () => {}),
      heartbeat: async () => {},
      publishInput: async () => {},
      publishSnapshot: async () => {},
      close: async () => {},
    };
    const { rooms } = manager({ attach: async () => handle, close: async () => {} });
    const socket = new FakeSocket();
    const connecting = rooms.add(socket as unknown as WebSocket, claims);
    const rejected = expect(connecting).rejects.toThrow();
    await expect.poll(() => handle.register.mock.calls.length, { timeout: 5_000 }).toBe(1);
    if (reason === "disconnect") {
      socket.close();
      finish();
    } else fail(new Error("Coordinator unavailable"));
    await rejected;
    expect(rooms.connectionCount).toBe(0);
    expect(handle.unregister).toHaveBeenCalledOnce();
  });

  it("evicts a crashed worker and reconnects to a new working session", async () => {
    const { rooms, metrics } = manager();
    const first = new FakeSocket();
    const joined = await rooms.add(first as unknown as WebSocket, claims);
    joined.session.handle(joined.connectionId, {
      type: "input",
      seq: 1,
      sentAt: Date.now(),
      payload: { crash: true },
    });
    await expect
      .poll(() => first.messages.some((message) => message.code === "GAME_WORKER_EXIT"), {
        timeout: 5_000,
      })
      .toBe(true);
    expect(first.readyState).toBe(3);
    expect(rooms.size).toBe(0);
    expect(rooms.connectionCount).toBe(0);
    expect(counters(rooms, metrics).sessionsClosed).toBe(1);

    const second = new FakeSocket();
    const rejoined = await rooms.add(second as unknown as WebSocket, {
      ...claims,
      jti: "new-ticket",
    });
    expect(rejoined.session).not.toBe(joined.session);
    rejoined.session.handle(rejoined.connectionId, {
      type: "input",
      seq: 1,
      sentAt: Date.now(),
      payload: { steer: 1 },
    });
    await expect
      .poll(
        () => [...second.messages].reverse().find((message) => message.type === "snapshot")?.state,
        { timeout: 5_000 },
      )
      .toEqual({ players: [{ id: "player-1", x: 1 }] });
    rooms.closeAll();
    expect(counters(rooms, metrics)).toMatchObject({ sessionsStarted: 2, sessionsClosed: 2 });
  });

  it("clears a pending idle timer when the room closes and counts its replacement once", async () => {
    const { rooms, metrics } = manager();
    const joined = await rooms.add(new FakeSocket() as unknown as WebSocket, claims);
    joined.session.remove(joined.connectionId);
    expect(rooms.size).toBe(1);
    joined.session.close();
    expect(rooms.size).toBe(0);
    await rooms.add(new FakeSocket() as unknown as WebSocket, claims);
    rooms.closeAll();
    expect(counters(rooms, metrics)).toMatchObject({ sessionsStarted: 2, sessionsClosed: 2 });
  });

  it("keeps blocked releases denied while counting a closed session once", async () => {
    const { rooms, metrics } = manager();
    await rooms.add(new FakeSocket() as unknown as WebSocket, claims);
    expect(
      rooms.applyReleaseStatus({
        type: "release-status",
        gameId: claims.gameId,
        version: claims.gameVersion,
        manifestSha256: claims.manifestSha256,
        status: "blocked",
        changedAt: Date.now(),
      }),
    ).toEqual({ sessions: 1, connections: 1 });
    expect(rooms.size).toBe(0);
    await expect(rooms.add(new FakeSocket() as unknown as WebSocket, claims)).rejects.toThrow();
    rooms.closeAll();
    expect(counters(rooms, metrics).sessionsClosed).toBe(1);
  });
});
