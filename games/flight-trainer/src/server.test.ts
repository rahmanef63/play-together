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
  it("turns left when the yoke is pushed left", async () => {
    const g = await createServerGame({ ...ctx, seed: 5, gameVersion: "0.2.3" });
    await g.onJoin({ id: "left", connectedAt: 0 });
    await g.onInput(
      "left",
      { throttle: 0.8, pitch: 0, roll: -1, yaw: 0, gear: true, flaps: false },
      1,
    );
    for (let i = 0; i < 30; i++) await g.tick(i * 50, 50);
    const after = (g.snapshot() as any).aircraft.find((a: any) => a.id === "left");
    expect(after.heading).toBeGreaterThan(0);
  });
});

import { type LandingAircraft, resolveGroundContact } from "./server/landing.js";

function landingFixture(overrides: Partial<LandingAircraft> = {}): LandingAircraft {
  return {
    x: 0,
    y: 1.2,
    z: -100,
    pitch: 0,
    roll: 0,
    airspeed: 30,
    verticalSpeed: -2,
    gearDown: true,
    airborne: true,
    landed: false,
    landingScored: false,
    crashed: false,
    missionComplete: false,
    nextCheckpoint: 0,
    score: 0,
    elapsedMs: 10000,
    ...overrides,
  };
}
const runway = { width: 22, zMin: -175, zMax: -45 };

describe("Flight Trainer landing regressions", () => {
  it("keeps airborne state through low-height frames and resolves ground contact", () => {
    const aircraft = landingFixture({ y: 1.3 });
    resolveGroundContact(aircraft, runway, 6);
    expect(aircraft.airborne).toBe(true);
    aircraft.y = 1.2;
    resolveGroundContact(aircraft, runway, 6);
    expect(aircraft.landed).toBe(true);
    expect(aircraft.airborne).toBe(false);
  });

  it("crashes unsafe touchdowns and scores a safe landing only once", () => {
    const unsafe = landingFixture({ gearDown: false });
    resolveGroundContact(unsafe, runway, 6);
    expect(unsafe.crashed).toBe(true);
    const safe = landingFixture();
    resolveGroundContact(safe, runway, 6);
    resolveGroundContact(safe, runway, 6);
    expect(safe.score).toBe(250);
    expect(safe.landingScored).toBe(true);
  });

  it("completes the mission only after all checkpoints and a safe landing", () => {
    const incomplete = landingFixture({ nextCheckpoint: 5 });
    resolveGroundContact(incomplete, runway, 6);
    expect(incomplete.missionComplete).toBe(false);
    const complete = landingFixture({ nextCheckpoint: 6 });
    resolveGroundContact(complete, runway, 6);
    expect(complete.missionComplete).toBe(true);
    expect(complete.score).toBeGreaterThan(250);
  });
});

describe("Flight Trainer input and ground regressions", () => {
  it("remains stationary at idle, accepts restart, and ignores invalid deltas", async () => {
    const game = await createServerGame(ctx);
    await game.onJoin({ id: "p", connectedAt: 0 });
    const initial = (game.snapshot() as any).aircraft[0];
    await game.tick(0, 1000);
    const idle = (game.snapshot() as any).aircraft[0];
    expect(idle.airspeed).toBe(0);
    expect(idle.x).toBe(initial.x);
    expect(idle.z).toBe(initial.z);
    const beforeInvalid = game.snapshot();
    await game.tick(1, Infinity);
    expect(game.snapshot()).toEqual(beforeInvalid);
    await game.onInput("p", { throttle: 1 }, 1);
    await game.tick(2, 50);
    await game.onInput("p", { restart: true }, 2);
    expect((game.snapshot() as any).aircraft[0].throttle).toBe(0);
  });

  it("levels attitude and brakes while on the ground", async () => {
    const game = await createServerGame(ctx);
    await game.onJoin({ id: "p", connectedAt: 0 });
    await game.onInput("p", { throttle: 1 }, 1);
    for (let i = 0; i < 40; i++) await game.tick(i, 50);
    const moving = (game.snapshot() as any).aircraft[0].airspeed;
    await game.onInput("p", { brake: true, level: true, pitch: 1, roll: 1 }, 2);
    for (let i = 0; i < 20; i++) await game.tick(i, 50);
    const after = (game.snapshot() as any).aircraft[0];
    expect(after.airspeed).toBeLessThan(moving);
    expect(Math.abs(after.pitch)).toBeLessThan(0.1);
    expect(Math.abs(after.roll)).toBeLessThan(0.1);
  });
});
