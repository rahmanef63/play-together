import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Snake Arena", () => {
  it("moves on server ticks", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "snake-arena",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    const before = (g.snapshot() as { players: Array<{ body: Array<{ x: number }> }> }).players[0]
      ?.body[0]?.x;
    expect(before).toBeDefined();
    if (before === undefined) throw new Error("Snake head missing");
    await g.tick(0, 100);
    await g.tick(100, 50);
    expect(
      (g.snapshot() as { players: Array<{ body: Array<{ x: number }> }> }).players[0]?.body[0]?.x,
    ).toBe(before + 1);
  });
  it("rejects reverse direction", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "snake-arena",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { dir: { x: -1, y: 0 } }, 1);
    await g.tick(0, 150);
    expect((g.snapshot() as { players: Array<{ dir: { x: number } }> }).players[0]?.dir.x).toBe(1);
  });
});
