import { describe, expect, it } from "vitest";
import { createServerGame } from "./server";

describe("Stack Tower", () => {
  it("stacks overlapping drops", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "stack-tower",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    for (let i = 0; i < 18; i++) await g.tick(0, 50);
    const before = (g.snapshot() as { players: Array<{ cursor: number }> }).players[0];
    expect(before).toBeDefined();
    await g.onInput("a", { action: "drop" }, 1);
    const after = (g.snapshot() as { players: Array<{ height: number; width: number }> })
      .players[0];
    expect(after).toBeDefined();
    expect(after?.height).toBe(1);
    expect(after?.width).toBeLessThanOrEqual(0.56);
  });
  it("ignores duplicate sequence", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "stack-tower",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { action: "drop" }, 1);
    const a = g.snapshot();
    await g.onInput("a", { action: "drop" }, 1);
    expect(g.snapshot()).toEqual(a);
  });
});
