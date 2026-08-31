import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const ctx = { roomId: "r", gameId: "sky-strike", gameVersion: "0.1.0", seed: 2 };
describe("Sky Strike", () => {
  it("spawns AI bandits and advances a player's aircraft", async () => {
    const g = await createServerGame(ctx);
    await g.onJoin({ id: "p", connectedAt: 0 });
    const before = (g.snapshot() as any).planes.find((p: any) => p.id === "p");
    await g.onInput("p", { throttle: 1, roll: 0.5, pitch: 0.2 }, 1);
    for (let i = 0; i < 20; i++) await g.tick(i * 50, 50);
    const s = g.snapshot() as any,
      after = s.planes.find((p: any) => p.id === "p");
    expect(s.planes.filter((p: any) => p.bot)).toHaveLength(3);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(20);
    expect(after.heading).not.toBe(before.heading);
  });
  it("fires cannon rounds with a server cooldown", async () => {
    const g = await createServerGame(ctx);
    await g.onJoin({ id: "p", connectedAt: 0 });
    await g.onInput("p", { gun: true }, 1);
    await g.tick(0, 50);
    expect(
      (g.snapshot() as any).shots.some((s: any) => s.kind === "bullet" && s.ownerId === "p"),
    ).toBe(true);
  });
  it("turns left when the flight stick is pushed left", async () => {
    const g = await createServerGame({ ...ctx, seed: 7, gameVersion: "0.2.3" });
    await g.onJoin({ id: "left", connectedAt: 0 });
    const before = (g.snapshot() as any).planes.find((p: any) => p.id === "left");
    await g.onInput("left", { roll: -1, pitch: 0, yaw: 0, throttle: 0.65 }, 1);
    for (let i = 0; i < 12; i++) await g.tick(i * 50, 50);
    const after = (g.snapshot() as any).planes.find((p: any) => p.id === "left");
    const delta = Math.atan2(
      Math.sin(after.heading - before.heading),
      Math.cos(after.heading - before.heading),
    );
    expect(delta).toBeGreaterThan(0);
  });
});
