import { describe, expect, it } from "vitest";
import { createServerGame } from "./server";

describe("Reaction Rush", () => {
  it("scores a valid reaction after GO", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "reaction-rush",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    for (let i = 0; i < 30; i++) await g.tick(i * 250, 250);
    let s = g.snapshot() as { phase: string };
    if (s.phase !== "go") {
      for (let i = 0; i < 20 && s.phase !== "go"; i++) {
        await g.tick(0, 250);
        s = g.snapshot() as { phase: string };
      }
    }
    expect(s.phase).toBe("go");
    await g.onInput("a", { action: "hit" }, 1);
    expect((g.snapshot() as { players: Array<{ score: number }> }).players[0]?.score).toBe(1);
  });
  it("penalizes false starts", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "reaction-rush",
      gameVersion: "0.1.0",
      seed: 2,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { action: "hit" }, 1);
    expect(
      (g.snapshot() as { players: Array<{ falseStarts: number }> }).players[0]?.falseStarts,
    ).toBe(1);
  });
});
