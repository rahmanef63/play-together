import { describe, expect, it } from "vitest";
import { signTicket, verifyTicket } from "./index";

const secret = "correct-horse-battery-staple-32-bytes-minimum";
const claims = {
  iss: "play-together" as const,
  aud: "play-together-realtime" as const,
  sub: "user-1",
  roomId: "room-1",
  roomCode: "ABC123",
  role: "controller" as const,
  mode: "remote" as const,
  gameId: "pong",
  gameVersion: "0.1.0",
  manifestUrl: "https://games.example.test/pong/0.1.0/manifest.json",
  manifestSha256: "a".repeat(64),
  iat: 100,
  exp: 700,
  jti: "nonce-123",
};

describe("join tickets", () => {
  it("round-trips valid claims", () => {
    const token = signTicket(claims, secret);
    expect(verifyTicket(token, secret, { nowSeconds: 200 })).toEqual(claims);
  });

  it("rejects a modified payload", () => {
    const token = signTicket(claims, secret);
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ ...claims, sub: "attacker" })).toString("base64url");
    expect(() => verifyTicket(parts.join("."), secret, { nowSeconds: 200 })).toThrow(
      "Invalid ticket signature",
    );
  });

  it("rejects expired tickets", () => {
    const token = signTicket(claims, secret);
    expect(() => verifyTicket(token, secret, { nowSeconds: 800 })).toThrow("Ticket expired");
  });
});
