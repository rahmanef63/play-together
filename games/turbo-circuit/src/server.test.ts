import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const ctx = { roomId: "r", gameId: "turbo-circuit", gameVersion: "0.9.0", seed: 7 };
async function startSolo(seed = 7) {
  const game = await createServerGame({ ...ctx, seed });
  await game.onJoin({ id: "p", connectedAt: 0 });
  await game.onInput("p", { action: "start" }, 1);
  for (let i = 0; i < 14; i++) await game.tick(i * 50, 50);
  expect((game.snapshot() as any).phase).toBe("countdown");
  for (let i = 0; i < 61; i++) await game.tick(700 + i * 50, 50);
  expect((game.snapshot() as any).phase).toBe("racing");
  return game;
}
const me = (game: any) => (game.snapshot() as any).racers.find((r: any) => r.id === "p");
describe("Turbo Circuit kart migration", () => {
  it("uses original kart and track selection before ready", async () => {
    const game = await createServerGame(ctx);
    await game.onJoin({ id: "p", connectedAt: 0 });
    let state = game.snapshot() as any;
    expect(state.trackId).toBe("neo-metro");
    expect(me(game).carId).toBe("falcon-r");
    await game.onInput("p", { steer: 1, menuY: 0 }, 1);
    expect(me(game).carId).toBe("comet-gt");
    await game.onInput("p", { steer: 0, menuY: 0 }, 2);
    await game.onInput("p", { steer: 0, menuY: 1 }, 3);
    state = game.snapshot() as any;
    expect(state.trackId).toBe("cosmic-loop");
    expect(state.pickups.length).toBeGreaterThan(20);
  });
  it("requires manual throttle and applies braking", async () => {
    const game = await startSolo();
    for (let i = 0; i < 15; i++) await game.tick(4000 + i * 50, 50);
    expect(me(game).speed).toBe(0);
    await game.onInput("p", { throttle: 1 }, 2);
    for (let i = 0; i < 25; i++) await game.tick(5000 + i * 50, 50);
    const moving = me(game).speed;
    expect(moving).toBeGreaterThan(12);
    await game.onInput("p", { throttle: 0, brake: 1 }, 3);
    for (let i = 0; i < 12; i++) await game.tick(6500 + i * 50, 50);
    expect(me(game).speed).toBeLessThan(moving);
  });
  it("charges drift sparks and grants mini turbo on release", async () => {
    const game = await startSolo(11);
    await game.onInput("p", { throttle: 1 }, 2);
    for (let i = 0; i < 36; i++) await game.tick(4000 + i * 50, 50);
    await game.onInput("p", { steer: 0.78, drift: true }, 3);
    for (let i = 0; i < 28; i++) await game.tick(6000 + i * 50, 50);
    expect(me(game).drifting).toBe(true);
    expect(me(game).driftTier).toBe(2);
    await game.onInput("p", { drift: false }, 4);
    await game.tick(7500, 50);
    expect(me(game).boostTimer).toBeGreaterThan(1.5);
  });
  it("maps left steering to the kart local left side", async () => {
    const game = await startSolo(3);
    await game.onInput("p", { throttle: 1 }, 2);
    for (let i = 0; i < 24; i++) await game.tick(4000 + i * 50, 50);
    const before = me(game);
    await game.onInput("p", { steer: -1 }, 3);
    for (let i = 0; i < 12; i++) await game.tick(5300 + i * 50, 50);
    const after = me(game),
      rightX = -Math.cos(before.heading),
      rightZ = Math.sin(before.heading),
      lateral = (after.x - before.x) * rightX + (after.z - before.z) * rightZ;
    expect(lateral).toBeLessThan(0);
  });
  it("cycles four camera modes and supports track rescue", async () => {
    const game = await startSolo();
    expect(me(game).cameraMode).toBe("chase");
    for (const expected of ["wide", "driver", "bumper", "chase"]) {
      await game.onInput("p", { action: "camera" }, 2);
      expect(me(game).cameraMode).toBe(expected);
    }
    await game.onInput("p", { action: "rescue" }, 3);
    expect(me(game).rescueCooldown).toBeGreaterThan(2);
    expect(me(game).invulnerableTimer).toBeGreaterThan(2);
    expect(me(game).wrongWay).toBe(false);
    expect(me(game).speed).toBe(0);
  });
  it("keeps CPU behavior bounded and non-uniform", async () => {
    const game = await startSolo(19),
      samples: number[] = [];
    for (let window = 0; window < 5; window++) {
      for (let i = 0; i < 14; i++) await game.tick(5000 + window * 700 + i * 50, 50);
      samples.push(
        ...(game.snapshot() as any).racers
          .filter((r: any) => r.bot)
          .map((r: any) => Math.round(r.speed * 10) / 10),
      );
    }
    expect(Math.min(...samples)).toBeGreaterThan(5);
    expect(Math.max(...samples)).toBeLessThan(58);
    expect(new Set(samples).size).toBeGreaterThan(5);
  });
  it("uses START to pause authoritative race simulation and resume", async () => {
    const game = await startSolo();
    await game.onInput("p", { throttle: 1 }, 2);
    for (let i = 0; i < 12; i++) await game.tick(4000 + i * 50, 50);
    const before = game.snapshot() as any;
    await game.onInput("p", { action: "start" }, 3);
    for (let i = 0; i < 12; i++) await game.tick(5000 + i * 50, 50);
    const paused = game.snapshot() as any;
    expect(paused.paused).toBe(true);
    expect(paused.raceMs).toBe(before.raceMs);
    await game.onInput("p", { action: "start" }, 4);
    await game.tick(6000, 50);
    expect((game.snapshot() as any).raceMs).toBeGreaterThan(paused.raceMs);
  });
});
