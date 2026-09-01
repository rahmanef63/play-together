import { describe, expect, it } from "vitest";
import {
  clientMessageSchema,
  GAME_PROTOCOL_VERSION,
  gameManifestSchema,
  serverMessageSchema,
  ticketClaimsSchema,
} from "./index.js";

const digest = "a".repeat(64);

describe("public contracts", () => {
  it("accepts a versioned game manifest", () => {
    const parsed = gameManifestSchema.parse({
      schemaVersion: 1,
      protocolVersion: GAME_PROTOCOL_VERSION,
      game: {
        id: "pong",
        version: "0.1.0",
        title: "Pong",
        description: "Reference game",
        minPlayers: 1,
        maxPlayers: 2,
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
        display: { url: "./display.js", sha256: digest },
        controller: { url: "./controller.js", sha256: digest },
        server: { url: "./server.js", sha256: digest },
      },
      assets: {
        "vehicle.red.atlas": {
          url: "./assets/vehicle-red-atlas.png",
          sha256: digest,
          contentType: "image/png",
          bytes: 1024,
        },
      },
      capabilities: { touch: true, keyboard: true, gamepad: true, motion: false },
    });
    expect(parsed.game.id).toBe("pong");
    expect(parsed.assets?.["vehicle.red.atlas"]?.contentType).toBe("image/png");
  });

  it("accepts a manifest-native builtin console without a controller bundle", () => {
    const parsed = gameManifestSchema.parse({
      schemaVersion: 1,
      protocolVersion: GAME_PROTOCOL_VERSION,
      game: {
        id: "manifest-console",
        version: "1.0.0",
        title: "Manifest Console",
        description: "Declarative controls",
        minPlayers: 1,
        maxPlayers: 4,
        tickRate: 60,
        snapshotRate: 20,
      },
      modes: ["shared-screen", "handheld"],
      controller: {
        supportsRemote: true,
        supportsHandheld: true,
        preferredOrientation: "landscape",
        console: {
          renderer: "builtin",
          layout: "gamepad",
          initialState: { move: 0 },
          controls: [
            {
              id: "move",
              kind: "stick",
              ariaLabel: "Move",
              zone: "left",
              action: { type: "patch", values: { move: "$x" } },
              release: { type: "patch", values: { move: 0 } },
            },
            {
              id: "action",
              kind: "button",
              label: "A",
              displayLabel: "BOOST",
              ariaLabel: "Action",
              face: "a",
              zone: "right",
              press: { type: "send", payload: { action: "go" } },
            },
          ],
        },
      },
      entries: {
        display: { url: "./display.js", sha256: digest },
        server: { url: "./server.js", sha256: digest },
      },
      capabilities: { touch: true, keyboard: true, gamepad: true, motion: false },
    });
    expect(parsed.controller.console?.controls).toHaveLength(2);
    expect(parsed.entries.controller).toBeUndefined();
  });

  it("tracks controller mode in authoritative realtime presence", () => {
    const parsed = serverMessageSchema.parse({
      type: "presence",
      players: [
        { playerId: "remote-1", role: "controller", mode: "remote", connectedAt: 123 },
        { playerId: "display-1", role: "display", mode: "remote", connectedAt: 124 },
      ],
    });
    expect(parsed.type).toBe("presence");
    if (parsed.type === "presence") expect(parsed.players[0]?.mode).toBe("remote");
  });

  it("rejects unknown realtime message types", () => {
    expect(clientMessageSchema.safeParse({ type: "execute", command: "rm" }).success).toBe(false);
  });

  it("requires short-lived ticket metadata", () => {
    const result = ticketClaimsSchema.safeParse({
      iss: "play-together",
      aud: "play-together-realtime",
      sub: "user-1",
      roomId: "room-1",
      roomCode: "ABC123",
      role: "controller",
      mode: "remote",
      gameId: "pong",
      gameVersion: "0.1.0",
      manifestUrl: "https://games.example.test/pong/0.1.0/manifest.json",
      manifestSha256: digest,
      iat: 100,
      exp: 200,
      jti: "nonce-123",
    });
    expect(result.success).toBe(true);
  });
  it("rejects non-semantic game versions", () => {
    expect(() =>
      gameManifestSchema.parse({
        schemaVersion: 1,
        protocolVersion: GAME_PROTOCOL_VERSION,
        game: {
          id: "demo-game",
          version: "release-latest",
          title: "Demo",
          description: "Demo game",
          minPlayers: 1,
          maxPlayers: 2,
          tickRate: 30,
          snapshotRate: 15,
        },
        modes: ["shared-screen"],
        controller: {
          supportsRemote: true,
          supportsHandheld: false,
          preferredOrientation: "adaptive",
        },
        entries: {
          display: { url: "./display.js", sha256: "a".repeat(64) },
          server: { url: "./server.js", sha256: "b".repeat(64) },
        },
        capabilities: { touch: true, keyboard: true, gamepad: false, motion: false },
      }),
    ).toThrow();
  });
});
