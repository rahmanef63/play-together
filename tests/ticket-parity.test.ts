import type { TicketClaims } from "@play-together/contracts";
import { signTicket as signGatewayTicket, verifyTicket } from "@play-together/security";
import { describe, expect, it } from "vitest";
import { signTicket as signConvexTicket } from "../convex/_shared/ticketCrypto";

const secret = "ticket-parity-secret-at-least-thirty-two-bytes";
const claims: TicketClaims = {
  iss: "play-together",
  aud: "play-together-realtime",
  sub: "user-1",
  roomId: "room-1",
  roomCode: "ABC123",
  role: "controller",
  mode: "handheld",
  gameId: "pong",
  gameVersion: "0.1.0",
  manifestUrl: "https://games.example.test/games/pong/0.1.0/manifest.json",
  manifestSha256: "a".repeat(64),
  iat: 100,
  exp: 700,
  jti: "parity-ticket-id",
};

describe("Convex and gateway ticket parity", () => {
  it("produces an identical HMAC token", async () => {
    const convexTicket = await signConvexTicket(claims, secret);
    const gatewayTicket = signGatewayTicket(claims, secret);
    expect(convexTicket).toBe(gatewayTicket);
    expect(verifyTicket(convexTicket, secret, { nowSeconds: 200 })).toEqual(claims);
  });
});
