import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { RoomSessionClients } from "./room-session-clients.js";

const now = Math.floor(Date.now() / 1_000);

const claims = {
  iss: "play-together" as const,
  aud: "play-together-realtime" as const,
  sub: "player-1",
  roomId: "room-1",
  roomCode: "ABC123",
  role: "display" as const,
  mode: "remote" as const,
  gameId: "pong",
  gameVersion: "0.4.0",
  manifestUrl: "https://game.example.test/games/pong/0.4.0/manifest.json",
  manifestSha256: "a".repeat(64),
  iat: now,
  exp: now + 60,
  jti: "ticket-1",
};

describe("RoomSessionClients telemetry throttle", () => {
  it("accepts at most one telemetry sample per ten seconds per connection", () => {
    const clients = new RoomSessionClients();
    const socket = { send() {}, close() {} } as unknown as WebSocket;
    const connection = clients.add(socket, claims);

    expect(clients.canRecordTelemetry(connection, 10_000)).toBe(true);
    expect(clients.canRecordTelemetry(connection, 19_999)).toBe(false);
    expect(clients.canRecordTelemetry(connection, 20_000)).toBe(true);
    clients.closeAll();
  });
});
