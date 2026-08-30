import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Orbit Dodge", () => {
  it("rotates a player", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "orbit-dodge",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { rotate: 1 }, 1);
    await g.tick(0, 50);
    expect(
      (g.snapshot() as { players: Array<{ angle: number }> }).players[0]?.angle,
    ).toBeGreaterThan(0);
  });
  it("spawns incoming meteors", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "orbit-dodge",
      gameVersion: "0.1.0",
      seed: 1,
    });
    for (let i = 0; i < 20; i++) await g.tick(0, 50);
    expect((g.snapshot() as { meteors: unknown[] }).meteors.length).toBeGreaterThan(0);
  });
});
