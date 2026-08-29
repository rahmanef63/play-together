import { describe, expect, it } from "vitest";
import {
  clientMessageSchema,
  GAME_PROTOCOL_VERSION,
  gameManifestSchema,
  ticketClaimsSchema,
} from "./index";

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
      capabilities: { touch: true, keyboard: true, gamepad: true, motion: false },
    });
    expect(parsed.game.id).toBe("pong");
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
});
