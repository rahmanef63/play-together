import { describe, expect, it } from "vitest";
import { createServerGame } from "./server";

describe("Pong server bundle", () => {
  it("accepts players, input, and advances deterministic state", async () => {
    const game = await createServerGame({
      roomId: "room-1",
      gameId: "pong",
      gameVersion: "0.1.0",
      seed: 42,
    });
    await game.onJoin({ id: "alice", connectedAt: 1 });
    await game.onJoin({ id: "bob", connectedAt: 2 });
    await game.onInput("alice", { move: 1 }, 0);
    const before = game.snapshot() as { paddles: [number, number]; ball: { x: number } };
    await game.tick(16, 16);
    const after = game.snapshot() as { paddles: [number, number]; ball: { x: number } };
    expect(after.paddles[0]).toBeGreaterThan(before.paddles[0]);
    expect(after.ball.x).not.toBe(before.ball.x);
  });

  it("ignores malformed input", async () => {
    const game = await createServerGame({
      roomId: "r",
      gameId: "pong",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await game.onJoin({ id: "alice", connectedAt: 1 });
    const before = game.snapshot();
    await game.onInput("alice", { move: "down" }, 0);
    await game.tick(16, 0);
    expect(game.snapshot()).toEqual(before);
  });
});
