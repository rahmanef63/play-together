import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const ctx = { roomId: "r", gameId: "turbo-circuit", gameVersion: "0.1.0", seed: 7 };
describe("Turbo Circuit", () => {
  it("accelerates a human car after the countdown", async () => {
    const g = await createServerGame(ctx);
    await g.onJoin({ id: "p", connectedAt: 0 });
    for (let i = 0; i < 61; i++) await g.tick(i * 50, 50);
    await g.onInput("p", { throttle: 1, steer: 0, brake: 0, boost: false }, 1);
    for (let i = 0; i < 20; i++) await g.tick(3100 + i * 50, 50);
    const me = (g.snapshot() as any).racers.find((r: any) => r.id === "p");
    expect(me.speed).toBeGreaterThan(10);
    expect(me.x).toBeGreaterThan(5);
  });
  it("drains nitro only while boosting", async () => {
    const g = await createServerGame(ctx);
    await g.onJoin({ id: "p", connectedAt: 0 });
    for (let i = 0; i < 61; i++) await g.tick(i * 50, 50);
    await g.onInput("p", { throttle: 1, boost: true }, 1);
    for (let i = 0; i < 10; i++) await g.tick(4000 + i * 50, 50);
    const me = (g.snapshot() as any).racers.find((r: any) => r.id === "p");
    expect(me.nitro).toBeLessThan(100);
  });
  it("maps left steering to the vehicle's local left side", async () => {
    const g = await createServerGame({ ...ctx, seed: 3, gameVersion: "0.2.3" });
    await g.onJoin({ id: "left", connectedAt: 0 });
    for (let i = 0; i < 70; i++) await g.tick(i * 50, 50);
    const before = (g.snapshot() as any).racers.find((r: any) => r.id === "left");
    await g.onInput("left", { throttle: 1, steer: -1, brake: 0, boost: false }, 1);
    for (let i = 0; i < 30; i++) await g.tick(4000 + i * 50, 50);
    const after = (g.snapshot() as any).racers.find((r: any) => r.id === "left");
    const rightX = -Math.cos(before.heading);
    const rightZ = Math.sin(before.heading);
    const lateral = (after.x - before.x) * rightX + (after.z - before.z) * rightZ;
    expect(lateral).toBeLessThan(0);
  });
});
