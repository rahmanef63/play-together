import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Maze Run", () => {
  it("moves through open cells", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "maze-run",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { move: { x: 1, y: 0 } }, 1);
    expect((g.snapshot() as { players: Array<{ x: number }> }).players[0]?.x).toBe(2);
  });
  it("blocks walls", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "maze-run",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { move: { x: 0, y: -1 } }, 1);
    expect((g.snapshot() as { players: Array<{ y: number }> }).players[0]?.y).toBe(1);
  });
});
