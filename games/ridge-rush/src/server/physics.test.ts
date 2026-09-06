import { describe, expect, it } from "vitest";
import {
  BIKE_GROUND_OFFSET,
  CHECKPOINTS,
  courseCrossSlope,
  courseElevation,
  FINISH_PROGRESS,
  gradeDegrees,
} from "../shared/course.js";
import { createRider } from "./model.js";
import { advanceRider, updateBotInput } from "./physics.js";

function simulate(rider: ReturnType<typeof createRider>, seconds: number, step = 0.05) {
  let elapsed = 0;
  while (elapsed < seconds) {
    elapsed += step;
    advanceRider(rider, step, elapsed * 1000);
  }
}
function place(rider: ReturnType<typeof createRider>, progress: number, speed: number) {
  rider.progress = progress;
  rider.speed = speed;
  rider.checkpoint = CHECKPOINTS.filter((checkpoint) => checkpoint < progress).length;
  rider.altitude = courseElevation(progress) + BIKE_GROUND_OFFSET;
}

describe("Ridge Rush 0.5 mountain physics", () => {
  it("drops almost a vertical kilometre, includes a climb, and has multiple 25°+ chutes", () => {
    expect(courseElevation(0) - courseElevation(FINISH_PROGRESS)).toBeGreaterThan(900);
    expect(courseElevation(2250) - courseElevation(2050)).toBeGreaterThan(30);
    expect(
      [60, 180, 260, 350, 500, 1000, 1700, 2400].filter((p) => gradeDegrees(p) > 25).length,
    ).toBeGreaterThanOrEqual(7);
  });

  it("gravity accelerates coasting on a steep chute and slows a local climb", () => {
    const downhill = createRider("downhill", 0),
      climb = createRider("climb", 0);
    place(downhill, 350, 14);
    place(climb, 2180, 14);
    simulate(downhill, 1);
    simulate(climb, 1);
    expect(downhill.speed).toBeGreaterThan(18);
    expect(downhill.speed).toBeGreaterThan(climb.speed + 5);
  });

  it("pedalling adds effort without being required for steep downhill speed", () => {
    const coast = createRider("coast", 0),
      pedal = createRider("pedal", 0);
    place(coast, 1260, 8);
    place(pedal, 1260, 8);
    pedal.input.pedal = true;
    simulate(coast, 2);
    simulate(pedal, 2);
    expect(pedal.speed).toBeGreaterThan(coast.speed);
    expect(pedal.stamina).toBeLessThanOrEqual(100);
  });

  it("brake dominates pedalling and strong downhill gravity", () => {
    const rider = createRider("brake", 0);
    place(rider, 1000, 26);
    rider.input.pedal = true;
    rider.input.brake = true;
    simulate(rider, 1);
    expect(rider.speed).toBeLessThan(18);
  });

  it("forward body weight acts as an aerodynamic tuck without shoulder buttons", () => {
    const upright = createRider("upright", 0),
      tucked = createRider("tucked", 0);
    place(upright, 1280, 30);
    place(tucked, 1280, 30);
    tucked.input.body = 1;
    simulate(upright, 1);
    simulate(tucked, 1);
    expect(tucked.speed).toBeGreaterThan(upright.speed);
  });

  it("keeps the rider on the cambered lane surface instead of the trail center plane", () => {
    const rider = createRider("cambered-height", 0);
    rider.lane = 2.4;
    place(rider, 520, 16);
    const before = rider.altitude;
    advanceRider(rider, 0.05, 50);
    expect(rider.grounded).toBe(true);
    expect(Math.abs(rider.altitude - before)).toBeGreaterThan(0.01);
    expect(rider.altitude).toBeCloseTo(
      courseElevation(rider.progress) +
        rider.lane * courseCrossSlope(rider.progress) +
        BIKE_GROUND_OFFSET,
      4,
    );
  });

  it("maps left input to visual-left lane and right input to visual-right lane", () => {
    const left = createRider("left", 0),
      right = createRider("right", 0);
    for (const rider of [left, right]) place(rider, 350, 20);
    left.lane = right.lane = 0;
    left.input.steer = -1;
    right.input.steer = 1;
    simulate(left, 0.45);
    simulate(right, 0.45);
    expect(left.lane).toBeGreaterThan(right.lane);
    expect(left.lean).toBeGreaterThan(0);
    expect(right.lean).toBeLessThan(0);
  });

  it("off-camber cliff terrain pulls a neutral rider laterally", () => {
    const rider = createRider("camber", 0);
    place(rider, 520, 22);
    const lane = rider.lane;
    simulate(rider, 0.6);
    expect(Math.abs(rider.lane - lane)).toBeGreaterThan(0.05);
  });

  it("the risky shortcut trades a narrower line for progress advantage", () => {
    const main = createRider("main", 0),
      shortcut = createRider("shortcut", 0);
    Object.assign(main, { progress: 1600, lane: 0, speed: 20, checkpoint: 3 });
    Object.assign(shortcut, { progress: 1600, lane: 5.3, speed: 20, checkpoint: 3 });
    main.altitude = shortcut.altitude = courseElevation(1600) + BIKE_GROUND_OFFSET;
    advanceRider(main, 0.1, 100);
    advanceRider(shortcut, 0.1, 100);
    expect(shortcut.progress).toBeGreaterThan(main.progress);
    expect(shortcut.crashed).toBe(0);
  });

  it("jumps use ballistic vertical velocity rather than an airtime timer", () => {
    const rider = createRider("jump", 0);
    place(rider, 1458, 23);
    rider.checkpoint = 3;
    rider.input.jump = true;
    advanceRider(rider, 0.05, 50);
    expect(rider.grounded).toBe(false);
    expect(rider.jumpReady).toBe(false);
    const velocity = rider.verticalSpeed;
    rider.input.jump = false;
    advanceRider(rider, 0.1, 150);
    expect(rider.verticalSpeed).toBeLessThan(velocity - 0.8);
    expect(rider.airTimeMs).toBeGreaterThan(0);
  });

  it("naturally leaves the trail at a fast drop lip without pressing jump", () => {
    const rider = createRider("drop", 0);
    place(rider, 1804, 29);
    rider.checkpoint = 4;
    advanceRider(rider, 0.1, 100);
    expect(rider.grounded).toBe(false);
    expect(rider.airTimeMs).toBe(0);
  });

  it("hard, badly aligned landings crash and rescue to the last checkpoint", () => {
    const rider = createRider("landing", 0);
    place(rider, 2010, 27);
    rider.checkpoint = 4;
    rider.grounded = false;
    rider.altitude += 0.15;
    rider.verticalSpeed = -17;
    rider.pitch = 0.9;
    rider.lean = 1;
    expect(advanceRider(rider, 0.05, 5000).crashed).toBe(true);
    for (let i = 0; i < 30; i += 1) advanceRider(rider, 0.05, 5050 + i * 50);
    expect(rider.crashed).toBe(0);
    expect(rider.progress).toBeGreaterThanOrEqual(CHECKPOINTS[3] + 7);
    expect(rider.rescueCount).toBe(1);
  });

  it("rejects checkpoint skipping and finishes only after all seven checkpoints", () => {
    const skip = createRider("skip", 0);
    place(skip, CHECKPOINTS[0] + 95, 18);
    skip.checkpoint = 0;
    expect(advanceRider(skip, 0.05, 2000).crashed).toBe(true);
    const valid = createRider("valid", 0);
    place(valid, FINISH_PROGRESS - 0.5, 20);
    valid.checkpoint = CHECKPOINTS.length;
    const finish = advanceRider(valid, 0.05, 42_000);
    expect(finish.finished).toBe(true);
    expect(valid.finishedAt).toBe(42_000);
  });

  it("produces deterministic bot decisions", () => {
    const a = createRider("bot-a", 2, true),
      b = createRider("bot-b", 2, true);
    Object.assign(a, { progress: 1640, lane: 0.5, stamina: 72, speed: 20 });
    Object.assign(b, { progress: 1640, lane: 0.5, stamina: 72, speed: 20 });
    updateBotInput(a, 91);
    updateBotInput(b, 91);
    expect(a.input).toEqual(b.input);
  });
});
