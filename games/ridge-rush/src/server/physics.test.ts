import { describe, expect, it } from "vitest";
import {
  BIKE_GROUND_OFFSET,
  CHECKPOINTS,
  courseElevation,
  FINISH_PROGRESS,
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

describe("Ridge Rush bike physics", () => {
  it("has a mountain-scale descent with a real local climb", () => {
    expect(courseElevation(0) - courseElevation(FINISH_PROGRESS)).toBeGreaterThan(160);
    expect(courseElevation(340)).toBeGreaterThan(courseElevation(250) + 4);
  });

  it("gravity accelerates a coasting rider on a steep descent", () => {
    const downhill = createRider("downhill", 0);
    const climb = createRider("climb", 0);
    Object.assign(downhill, { progress: 120, speed: 12 });
    Object.assign(climb, { progress: 285, speed: 12, checkpoint: 1 });
    downhill.altitude = courseElevation(downhill.progress) + BIKE_GROUND_OFFSET;
    climb.altitude = courseElevation(climb.progress) + BIKE_GROUND_OFFSET;
    simulate(downhill, 1);
    simulate(climb, 1);
    expect(downhill.speed).toBeGreaterThan(climb.speed + 1.5);
  });

  it("pedalling accelerates beyond downhill coasting", () => {
    const coast = createRider("coast", 0);
    const pedal = createRider("pedal", 0);
    pedal.input.pedal = true;
    simulate(coast, 3);
    simulate(pedal, 3);
    expect(pedal.speed).toBeGreaterThan(coast.speed + 7);
    expect(pedal.progress).toBeGreaterThan(coast.progress + 10);
  });

  it("brake dominates pedal, sprint and downhill gravity", () => {
    const rider = createRider("brake", 0);
    Object.assign(rider, { progress: 120, speed: 23 });
    rider.altitude = courseElevation(rider.progress) + BIKE_GROUND_OFFSET;
    Object.assign(rider.input, { pedal: true, sprint: true, brake: true });
    const stamina = rider.stamina;
    simulate(rider, 1);
    expect(rider.speed).toBeLessThan(15);
    expect(rider.stamina).toBeGreaterThanOrEqual(stamina);
  });

  it("sprint requires pedalling, is faster, and consumes bounded stamina", () => {
    const normal = createRider("normal", 0);
    const sprint = createRider("sprint", 0);
    normal.input.pedal = true;
    Object.assign(sprint.input, { pedal: true, sprint: true });
    simulate(normal, 2);
    simulate(sprint, 2);
    expect(sprint.speed).toBeGreaterThan(normal.speed);
    expect(sprint.stamina).toBeLessThan(100);
    sprint.input.pedal = false;
    const stamina = sprint.stamina;
    simulate(sprint, 1);
    expect(sprint.stamina).toBeGreaterThan(stamina);
    expect(sprint.stamina).toBeLessThanOrEqual(100);
  });

  it("takes the narrow shortcut faster than the main line", () => {
    const main = createRider("main", 0);
    const shortcut = createRider("shortcut", 0);
    Object.assign(main, { progress: 620, lane: 0, speed: 20, checkpoint: 3 });
    Object.assign(shortcut, { progress: 620, lane: 4.1, speed: 20, checkpoint: 3 });
    main.altitude = courseElevation(main.progress) + BIKE_GROUND_OFFSET;
    shortcut.altitude = courseElevation(shortcut.progress) + BIKE_GROUND_OFFSET;
    main.input.pedal = shortcut.input.pedal = true;
    advanceRider(main, 0.05, 50);
    advanceRider(shortcut, 0.05, 50);
    expect(shortcut.progress).toBeGreaterThan(main.progress);
  });

  it("uses vertical velocity and gravity for jumps instead of an airtime timer", () => {
    const rider = createRider("jump", 0);
    Object.assign(rider, { progress: 292, speed: 18, lane: 0, checkpoint: 1 });
    rider.altitude = courseElevation(rider.progress) + BIKE_GROUND_OFFSET;
    rider.input.jump = true;
    advanceRider(rider, 0.05, 50);
    expect(rider.grounded).toBe(false);
    expect(rider.verticalSpeed).toBeGreaterThan(0);
    expect(rider.jumpReady).toBe(false);
    const launchVelocity = rider.verticalSpeed;
    advanceRider(rider, 0.2, 250);
    expect(rider.verticalSpeed).toBeLessThan(launchVelocity - 1.5);
    rider.input.jump = false;
    simulate(rider, 2);
    expect(rider.grounded).toBe(true);
    expect(rider.jumpReady).toBe(true);
  });

  it("naturally leaves the ground over a fast drop lip without pressing jump", () => {
    const rider = createRider("drop", 0);
    Object.assign(rider, { progress: 520, speed: 24, checkpoint: 2 });
    rider.altitude = courseElevation(rider.progress) + BIKE_GROUND_OFFSET;
    advanceRider(rider, 0.05, 50);
    expect(rider.grounded).toBe(false);
    const before = rider.verticalSpeed;
    advanceRider(rider, 0.1, 150);
    expect(rider.verticalSpeed).toBeLessThan(before);
  });

  it("crashes a hard unstable landing and rescues to the last checkpoint", () => {
    const rider = createRider("landing", 0);
    Object.assign(rider, {
      progress: CHECKPOINTS[1] + 20,
      checkpoint: 2,
      speed: 25,
      lean: 1,
      grounded: false,
      verticalSpeed: -13,
    });
    rider.altitude = courseElevation(rider.progress) + BIKE_GROUND_OFFSET + 0.08;
    rider.input.body = -1;
    rider.input.steer = 1;
    const result = advanceRider(rider, 0.05, 5000);
    expect(result.crashed).toBe(true);
    expect(rider.crashed).toBeGreaterThan(1);
    for (let i = 0; i < 25; i += 1) advanceRider(rider, 0.05, 5050 + i * 50);
    expect(rider.crashed).toBe(0);
    expect(rider.progress).toBeGreaterThanOrEqual(CHECKPOINTS[1] + 4);
    expect(rider.progress).toBeLessThan(CHECKPOINTS[1] + 7);
    expect(rider.grounded).toBe(true);
    expect(rider.rescueCount).toBe(1);
  });

  it("rejects checkpoint skipping and finishes only after every checkpoint", () => {
    const skip = createRider("skip", 0);
    Object.assign(skip, { progress: CHECKPOINTS[0] + 35, speed: 18, checkpoint: 0 });
    skip.altitude = courseElevation(skip.progress) + BIKE_GROUND_OFFSET;
    expect(advanceRider(skip, 0.05, 2000).crashed).toBe(true);

    const valid = createRider("valid", 0);
    Object.assign(valid, {
      progress: FINISH_PROGRESS - 0.5,
      speed: 20,
      checkpoint: CHECKPOINTS.length,
    });
    valid.altitude = courseElevation(valid.progress) + BIKE_GROUND_OFFSET;
    expect(advanceRider(valid, 0.05, 42_000).finished).toBe(true);
    expect(valid.finishedAt).toBe(42_000);
  });

  it("produces deterministic bot decisions for the same rider and seed", () => {
    const a = createRider("bot-a", 2, true);
    const b = createRider("bot-b", 2, true);
    Object.assign(a, { progress: 640, lane: 0.5, stamina: 72, speed: 20 });
    Object.assign(b, { progress: 640, lane: 0.5, stamina: 72, speed: 20 });
    updateBotInput(a, 91);
    updateBotInput(b, 91);
    expect(a.input).toEqual(b.input);
  });
});
