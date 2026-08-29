import { describe, expect, it } from "vitest";
import { createServerGame } from "./server";

describe("Target Blast", () => {
  it("scores coordinate hits", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "target-blast",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    const t = (g.snapshot() as { targets: Array<{ x: number; y: number }> }).targets[0];
    expect(t).toBeDefined();
    await g.onInput("a", { action: "shoot", x: t?.x ?? 0, y: t?.y ?? 0 }, 1);
    expect((g.snapshot() as { players: Array<{ score: number }> }).players[0]?.score).toBe(10);
  });
  it("counts misses without scoring", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "target-blast",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { action: "shoot", x: 0, y: 0 }, 1);
    const p = (g.snapshot() as { players: Array<{ score: number; shots: number }> }).players[0];
    expect(p).toBeDefined();
    expect(p?.score).toBe(0);
    expect(p?.shots).toBe(1);
  });
});
