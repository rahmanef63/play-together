import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const ctx = { roomId: "r", gameId: "flight-trainer", gameVersion: "0.1.0", seed: 1 };
describe("Flight Trainer", () => {
  it("accelerates, rotates and takes off from the runway", async () => {
    const g = await createServerGame(ctx);
    await g.onJoin({ id: "p", connectedAt: 0 });
    await g.onInput("p", { throttle: 1, pitch: 0.7, roll: 0.15, gear: true, flaps: true }, 1);
    for (let i = 0; i < 180; i++) await g.tick(i * 50, 50);
    const a = (g.snapshot() as any).aircraft[0];
    expect(a.airspeed).toBeGreaterThan(45);
    expect(a.y).toBeGreaterThan(5);
    expect(a.heading).not.toBe(0);
  });
  it("ignores malformed numeric controls", async () => {
    const g = await createServerGame(ctx);
    await g.onJoin({ id: "p", connectedAt: 0 });
    await g.onInput("p", { throttle: "max" }, 1);
    await g.tick(0, 50);
    expect((g.snapshot() as any).aircraft[0].throttle).toBe(0);
  });
});
