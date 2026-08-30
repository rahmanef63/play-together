import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Memory Lights", () => {
  it("accepts the shown sequence", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "memory-lights",
      gameVersion: "0.1.0",
      seed: 3,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    for (let i = 0; i < 40 && (g.snapshot() as { phase: string }).phase !== "input"; i++)
      await g.tick(0, 250);
    const s = g.snapshot() as { sequence: number[] };
    let q = 1;
    for (const pad of s.sequence) await g.onInput("a", { pad }, q++);
    expect((g.snapshot() as { players: Array<{ score: number }> }).players[0]?.score).toBe(1);
  });
  it("resets progress on a wrong pad", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "memory-lights",
      gameVersion: "0.1.0",
      seed: 9,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    for (let i = 0; i < 40 && (g.snapshot() as { phase: string }).phase !== "input"; i++)
      await g.tick(0, 250);
    const s = g.snapshot() as { sequence: number[] };
    const first = s.sequence[0];
    expect(first).toBeDefined();
    await g.onInput("a", { pad: ((first ?? 0) + 1) % 4 }, 1);
    expect((g.snapshot() as { players: Array<{ progress: number }> }).players[0]?.progress).toBe(0);
  });
});
