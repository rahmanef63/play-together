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

import { respawnPlane, type Shot, spawnPlane } from "./server/model.js";
import { resolveHit, segmentHitFraction } from "./server/projectileCollision.js";

function shot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 1,
    kind: "bullet",
    ownerId: "owner",
    targetId: null,
    x: 20,
    y: 20,
    z: 0,
    vx: 400,
    vy: 0,
    vz: 0,
    ttl: 1000,
    ...overrides,
  };
}

describe("Sky Strike projectile collision regressions", () => {
  it("detects swept projectile segments rather than only endpoint overlap", () => {
    expect(
      segmentHitFraction({ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 2.5),
    ).toBeCloseTo(0.375);
  });

  it("damages the nearest intersected target regardless of plane array order", () => {
    const owner = spawnPlane("owner", "OWNER", false, 0);
    const near = spawnPlane("near", "NEAR", false, 1);
    const far = spawnPlane("far", "FAR", false, 2);
    Object.assign(near, { x: 8, y: 20, z: 0, spawnProtectionMs: 0 });
    Object.assign(far, { x: 14, y: 20, z: 0, spawnProtectionMs: 0 });
    const projectile = shot();
    resolveHit(projectile, [owner, far, near], { x: 0, y: 20, z: 0 });
    expect(near.hp).toBe(89);
    expect(far.hp).toBe(100);
  });

  it("does not hit expired shots or respawning/protected targets", () => {
    const owner = spawnPlane("owner", "OWNER", false, 0);
    const protectedTarget = spawnPlane("target", "TARGET", false, 1);
    Object.assign(protectedTarget, { x: 8, y: 20, z: 0, spawnProtectionMs: 0 });
    resolveHit(shot({ ttl: 0 }), [owner, protectedTarget], { x: 0, y: 20, z: 0 });
    expect(protectedTarget.hp).toBe(100);
    protectedTarget.spawnProtectionMs = 100;
    resolveHit(shot(), [owner, protectedTarget], { x: 0, y: 20, z: 0 });
    expect(protectedTarget.hp).toBe(100);
    protectedTarget.spawnProtectionMs = 0;
    protectedTarget.respawnMs = 100;
    resolveHit(shot(), [owner, protectedTarget], { x: 0, y: 20, z: 0 });
    expect(protectedTarget.hp).toBe(100);
  });
});

describe("Sky Strike model and control regressions", () => {
  it("uses evenly spaced respawn slots", () => {
    const planes = Array.from({ length: 4 }, (_, index) =>
      spawnPlane(`p${index}`, `P${index}`, false, index),
    );
    planes.forEach((plane, index) => {
      respawnPlane(plane, index, planes.length);
    });
    const angles = planes.map((plane) => Math.atan2(plane.z, plane.x)).sort((a, b) => a - b);
    const gaps = angles.map(
      (angle, index) =>
        (angles[(index + 1) % angles.length]! - angle + Math.PI * 2) % (Math.PI * 2),
    );
    gaps.forEach((gap) => {
      expect(gap).toBeCloseTo(Math.PI / 2);
    });
  });

  it("makes airbrake override afterburner and restores fuel when afterburner is off", async () => {
    const game = await createServerGame(ctx);
    await game.onJoin({ id: "p", connectedAt: 0 });
    await game.onInput("p", { throttle: 1, afterburner: true, airbrake: true }, 1);
    await game.tick(0, 50);
    const braking = (game.snapshot() as any).planes.find((plane: any) => plane.id === "p");
    expect(braking.afterburnerActive).toBe(false);
    expect(braking.afterburnerFuel).toBe(1);
    await game.onInput("p", { afterburner: true, airbrake: false }, 2);
    await game.tick(1, 50);
    const burning = (game.snapshot() as any).planes.find((plane: any) => plane.id === "p");
    expect(burning.afterburnerActive).toBe(true);
    expect(burning.afterburnerFuel).toBeLessThan(1);
    await game.onInput("p", { afterburner: false }, 3);
    await game.tick(2, 50);
    const recovered = (game.snapshot() as any).planes.find((plane: any) => plane.id === "p");
    expect(recovered.afterburnerFuel).toBeGreaterThan(burning.afterburnerFuel);
  });

  it("rejects malformed controls and invalid tick deltas", async () => {
    const game = await createServerGame(ctx);
    await game.onJoin({ id: "p", connectedAt: 0 });
    const before = game.snapshot();
    await game.tick(0, Infinity);
    expect(game.snapshot()).toEqual(before);
    const clean = await createServerGame(ctx);
    await clean.onJoin({ id: "p", connectedAt: 0 });
    await game.onInput("p", { throttle: Number.NaN, afterburner: "invalid" }, 1);
    await game.tick(0, 50);
    await clean.tick(0, 50);
    expect(game.snapshot()).toEqual(clean.snapshot());
  });
});
