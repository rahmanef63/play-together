import { describe, expect, it } from "vitest";
import { createServerGame } from "./server";

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
});
