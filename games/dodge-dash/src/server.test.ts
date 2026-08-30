import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Dodge Dash", () => {
  it("moves players horizontally", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "dodge-dash",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { move: 1 }, 1);
    await g.tick(0, 50);
    expect((g.snapshot() as { players: Array<{ x: number }> }).players[0]?.x).toBeGreaterThan(0.5);
  });
  it("spawns hazards over time", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "dodge-dash",
      gameVersion: "0.1.0",
      seed: 1,
    });
    for (let i = 0; i < 20; i++) await g.tick(0, 50);
    expect((g.snapshot() as { hazards: unknown[] }).hazards.length).toBeGreaterThan(0);
  });
});
