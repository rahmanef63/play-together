import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Tug War", () => {
  it("assigns opposite teams", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "tug-war",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onJoin({ id: "b", connectedAt: 0 });
    const p = (g.snapshot() as { players: Array<{ team: number }> }).players;
    expect(p[0]?.team).not.toBe(p[1]?.team);
  });
  it("moves rope for pulls", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "tug-war",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { action: "pull" }, 1);
    expect((g.snapshot() as { rope: number }).rope).toBe(-1);
  });
});
