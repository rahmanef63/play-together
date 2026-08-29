import { describe, expect, it } from "vitest";
import { createServerGame } from "./server";

const context = { roomId: "room", gameId: "tap-race", gameVersion: "0.1.0", seed: 42 };

describe("Tap Race server bundle", () => {
  it("accepts four racers, declares one winner, and resets the next round", async () => {
    const game = await createServerGame(context);
    for (const id of ["a", "b", "c", "d", "ignored"]) {
      await game.onJoin({ id, connectedAt: 1 });
    }
    expect((game.snapshot() as { racers: unknown[] }).racers).toHaveLength(4);
    for (let sequence = 0; sequence < 25; sequence += 1) {
      await game.onInput("a", { action: "tap" }, sequence);
    }
    const won = game.snapshot() as {
      phase: string;
      winnerId: string | null;
      racers: Array<{ progress: number }>;
    };
    expect(won.phase).toBe("finished");
    expect(won.winnerId).toBe("a");
    expect(won.racers[0]?.progress).toBe(100);
    for (let elapsed = 0; elapsed < 2_600; elapsed += 100) await game.tick(elapsed, 100);
    const reset = game.snapshot() as {
      phase: string;
      winnerId: string | null;
      racers: Array<{ progress: number }>;
    };
    expect(reset.phase).toBe("playing");
    expect(reset.winnerId).toBeNull();
    expect(reset.racers.every((racer) => racer.progress === 0)).toBe(true);
  });

  it("ignores malformed and duplicate input", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "a", connectedAt: 1 });
    await game.onInput("a", { action: "tap" }, 1);
    await game.onInput("a", { action: "tap" }, 1);
    await game.onInput("a", { action: "other" }, 2);
    const state = game.snapshot() as { racers: Array<{ progress: number }> };
    expect(state.racers[0]?.progress).toBe(4);
  });
});
