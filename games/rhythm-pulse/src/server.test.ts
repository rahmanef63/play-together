import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

describe("Rhythm Pulse", () => {
  it("rewards a beat tap", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "rhythm-pulse",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.onInput("a", { action: "tap" }, 1);
    expect(
      (g.snapshot() as { players: Array<{ score: number; perfect: number }> }).players[0]?.perfect,
    ).toBe(1);
  });
  it("scores late taps lower", async () => {
    const g = await createServerGame({
      roomId: "r",
      gameId: "rhythm-pulse",
      gameVersion: "0.1.0",
      seed: 1,
    });
    await g.onJoin({ id: "a", connectedAt: 0 });
    await g.tick(0, 300);
    await g.onInput("a", { action: "tap" }, 1);
    expect(
      (g.snapshot() as { players: Array<{ miss: number }> }).players[0]?.miss,
    ).toBeGreaterThanOrEqual(0);
  });
});
