import { describe, expect, it } from "vitest";
import { CHECKPOINTS, FINISH_PROGRESS } from "../shared/course.js";
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
  it("pedalling accelerates beyond downhill coasting", () => {
    const coast = createRider("coast", 0);
    const pedal = createRider("pedal", 0);
    pedal.input.pedal = true;
    simulate(coast, 3);
    simulate(pedal, 3);
    expect(pedal.speed).toBeGreaterThan(coast.speed + 6);
    expect(pedal.progress).toBeGreaterThan(coast.progress + 8);
  });

  it("brake takes priority over pedal and sprint", () => {
    const rider = createRider("brake", 0);
    rider.speed = 23;
    Object.assign(rider.input, { pedal: true, sprint: true, brake: true });
    const stamina = rider.stamina;
    advanceRider(rider, 0.5, 500);
    expect(rider.speed).toBeLessThan(12);
    expect(rider.stamina).toBeGreaterThanOrEqual(stamina);
  });

  it("sprint requires pedalling, is faster, and consumes bounded stamina", () => {
    const normal = createRider("normal", 0);
    const sprint = createRider("sprint", 0);
    Object.assign(normal.input, { pedal: true });
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
    main.input.pedal = shortcut.input.pedal = true;
    advanceRider(main, 0.5, 500);
    advanceRider(shortcut, 0.5, 500);
    expect(shortcut.progress).toBeGreaterThan(main.progress);
    expect(shortcut.crashed).toBe(0);
  });

  it("launches from a ramp only once until jump is released", () => {
    const rider = createRider("jump", 0);
    Object.assign(rider, { progress: 292, speed: 18, lane: 0, checkpoint: 1 });
    rider.input.jump = true;
    advanceRider(rider, 0.05, 50);
    expect(rider.airborne).toBeGreaterThan(0.5);
    expect(rider.jumpReady).toBe(false);
    const total = rider.airTotal;
    simulate(rider, 0.8);
    expect(rider.airTotal).toBe(total);
    rider.input.jump = false;
    advanceRider(rider, 0.05, 900);
    expect(rider.jumpReady).toBe(true);
  });

  it("crashes an unstable high-speed landing and rescues to the last checkpoint", () => {
    const rider = createRider("landing", 0);
    Object.assign(rider, {
      progress: CHECKPOINTS[1] + 20,
      checkpoint: 2,
      speed: 28,
      lean: 1,
      airborne: 0.02,
      airTotal: 0.6,
    });
    rider.input.body = -1;
    rider.input.steer = 1;
    const result = advanceRider(rider, 0.05, 5000);
    expect(result.crashed).toBe(true);
    expect(rider.crashed).toBeGreaterThan(1);
    for (let i = 0; i < 25; i += 1) advanceRider(rider, 0.05, 5050 + i * 50);
    expect(rider.crashed).toBe(0);
    expect(rider.progress).toBeGreaterThanOrEqual(CHECKPOINTS[1] + 4);
    expect(rider.progress).toBeLessThan(CHECKPOINTS[1] + 7);
    expect(rider.rescueCount).toBe(1);
  });

  it("rejects checkpoint skipping by crashing before a rider can finish", () => {
    const rider = createRider("skip", 0);
    Object.assign(rider, { progress: CHECKPOINTS[0] + 35, speed: 18, checkpoint: 0 });
    const result = advanceRider(rider, 0.05, 2000);
    expect(result.crashed).toBe(true);
    expect(rider.checkpoint).toBe(0);
  });

  it("finishes only after every checkpoint was crossed", () => {
    const valid = createRider("valid", 0);
    Object.assign(valid, {
      progress: FINISH_PROGRESS - 0.5,
      speed: 20,
      checkpoint: CHECKPOINTS.length,
    });
    const finish = advanceRider(valid, 0.05, 42_000);
    expect(finish.finished).toBe(true);
    expect(valid.finishedAt).toBe(42_000);
    expect(valid.speed).toBe(0);

    const invalid = createRider("invalid", 0);
    Object.assign(invalid, {
      progress: FINISH_PROGRESS - 0.5,
      speed: 20,
      checkpoint: CHECKPOINTS.length - 1,
    });
    expect(advanceRider(invalid, 0.05, 42_000).finished).toBe(false);
    expect(invalid.crashed).toBeGreaterThan(0);
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
