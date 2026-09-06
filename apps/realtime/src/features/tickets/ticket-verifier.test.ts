import type { TicketClaims } from "@play-together/contracts";
import { signTicket } from "@play-together/security";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../config";
import { createTicketVerifier } from "./ticket-verifier";

const now = Math.floor(Date.now() / 1000);
const claims: TicketClaims = {
  iss: "play-together",
  aud: "play-together-realtime",
  sub: "user-1",
  roomId: "room-1",
  roomCode: "ABCD",
  role: "display",
  mode: "remote",
  gameId: "clash-arena",
  gameVersion: "0.4.0",
  manifestUrl: "https://game.rahmanef.com/games/clash-arena/0.4.0/manifest.json",
  manifestSha256: "a".repeat(64),
  iat: now,
  exp: now + 600,
  jti: "ticket-jti-remote",
};

afterEach(() => vi.unstubAllGlobals());

describe("ticket verifier", () => {
  it("keeps local HMAC verification for local and rollback runtimes", async () => {
    const secret = "x".repeat(48);
    const config = loadConfig({
      JOIN_TICKET_SECRET: secret,
      ALLOWED_ORIGINS: "https://play.test",
      GAME_MODULE_ORIGINS: "https://games.test",
    });
    await expect(createTicketVerifier(config).verify(signTicket(claims, secret))).resolves.toEqual(
      claims,
    );
  });

  it("uses the Convex production verifier without a local join secret", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        requests.push({
          url: String(input),
          body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        return new Response(JSON.stringify({ status: "success", value: claims, logLines: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const config = loadConfig({
      TICKET_VERIFIER_CONVEX_URL: "https://upbeat-dog-398.convex.cloud",
      ALLOWED_ORIGINS: "https://play.test",
      GAME_MODULE_ORIGINS: "https://games.test",
    });
    await expect(createTicketVerifier(config).verify("opaque-ticket")).resolves.toEqual(claims);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://upbeat-dog-398.convex.cloud/api/action");
    expect(requests[0]?.body).toMatchObject({ path: "gatewayTickets:verifyRealtime" });
  });
});
