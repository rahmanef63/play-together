import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("gateway configuration", () => {
  it("requires an origin allowlist and strong ticket secret", () => {
    expect(() =>
      loadConfig({
        JOIN_TICKET_SECRET: "short",
        ALLOWED_ORIGINS: "https://play.test",
        GAME_MODULE_ORIGINS: "https://games.test",
      }),
    ).toThrow();
    expect(() =>
      loadConfig({
        JOIN_TICKET_SECRET: "x".repeat(40),
        ALLOWED_ORIGINS: "",
        GAME_MODULE_ORIGINS: "https://games.test",
      }),
    ).toThrow();
  });

  it("parses safe production defaults", () => {
    const config = loadConfig({
      JOIN_TICKET_SECRET: "x".repeat(40),
      ALLOWED_ORIGINS: "https://play.test,https://display.test",
      GAME_MODULE_ORIGINS: "https://games.test",
    });
    expect(config.allowedOrigins.has("https://play.test")).toBe(true);
    expect(config.moduleOrigins.has("https://games.test")).toBe(true);
    expect(config.moduleOriginMap.size).toBe(0);
    expect(config.allowInsecureModuleOrigins).toBe(false);
    expect(config.maxPayloadBytes).toBe(65_536);
    expect(config.ticketSecrets).toEqual(["x".repeat(40)]);
  });

  it("supports an explicitly configured next ticket secret for zero-downtime rotation", () => {
    const current = "a".repeat(40);
    const next = "b".repeat(40);
    const config = loadConfig({
      JOIN_TICKET_SECRET: current,
      JOIN_TICKET_SECRET_NEXT: next,
      ALLOWED_ORIGINS: "https://play.test",
      GAME_MODULE_ORIGINS: "https://games.test",
    });
    expect(config.ticketSecret).toBe(current);
    expect(config.ticketSecrets).toEqual([current, next]);
    expect(() =>
      loadConfig({
        JOIN_TICKET_SECRET: current,
        JOIN_TICKET_SECRET_NEXT: "short",
        ALLOWED_ORIGINS: "https://play.test",
        GAME_MODULE_ORIGINS: "https://games.test",
      }),
    ).toThrow(/JOIN_TICKET_SECRET_NEXT/);
  });

  it("allows Convex verification without copying the production join secret to the VPS", () => {
    const config = loadConfig({
      TICKET_VERIFIER_CONVEX_URL: "https://upbeat-dog-398.convex.cloud",
      ALLOWED_ORIGINS: "https://play.test",
      GAME_MODULE_ORIGINS: "https://games.test",
    });
    expect(config.ticketVerifierConvexUrl).toBe("https://upbeat-dog-398.convex.cloud");
    expect(config.ticketSecrets).toEqual([]);
    expect(config.ticketVerifierTimeoutMs).toBe(5_000);
  });

  it("fails fast when distributed coordination is required without Redis", () => {
    expect(() =>
      loadConfig({
        JOIN_TICKET_SECRET: "x".repeat(40),
        ALLOWED_ORIGINS: "https://play.test",
        GAME_MODULE_ORIGINS: "https://games.test",
        REQUIRE_DISTRIBUTED_COORDINATION: "true",
      }),
    ).toThrow(/REDIS_URL/);

    const config = loadConfig({
      JOIN_TICKET_SECRET: "x".repeat(40),
      ALLOWED_ORIGINS: "https://play.test",
      GAME_MODULE_ORIGINS: "https://games.test",
      REQUIRE_DISTRIBUTED_COORDINATION: "true",
      REDIS_URL: "redis://localhost:6379",
    });
    expect(config.requireDistributedCoordination).toBe(true);
    expect(config.redisUrl).toBe("redis://localhost:6379");
  });
});
