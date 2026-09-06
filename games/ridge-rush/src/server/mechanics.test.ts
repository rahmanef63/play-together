import { describe, expect, it } from "vitest";
import {
  brakeForce,
  registerAttackEdge,
  registerJumpEdge,
  registerPedalEdge,
  resolveLanding,
  updateContext,
} from "./mechanics.js";
import { createRider } from "./model.js";

describe("Ridge Rush classic downhill mechanics", () => {
  it("starts a stamina-limited sprint from a quick pedal double-tap", () => {
    const rider = createRider("sprint", 0);
    registerPedalEdge(rider, true, 1_000);
    rider.input.pedal = true;
    updateContext(rider, 1_000, 0.016);
    expect(rider.sprinting).toBe(false);
    rider.input.pedal = false;
    updateContext(rider, 1_100, 0.016);
    registerPedalEdge(rider, true, 1_220);
    rider.input.pedal = true;
    updateContext(rider, 1_220, 0.016);
    expect(rider.sprinting).toBe(true);
    expect(rider.sprintMs).toBeGreaterThan(1_000);
  });

  it("accepts two distinct pedal edges that arrive in one server tick", () => {
    const rider = createRider("batched-sprint", 0);
    registerPedalEdge(rider, true, 1_000);
    rider.input.pedal = true;
    rider.input.pedal = false;
    registerPedalEdge(rider, true, 1_000);
    rider.input.pedal = true;
    updateContext(rider, 1_000, 0.016);
    expect(rider.sprinting).toBe(true);
  });

  it("biases B toward front brake with body forward and rear brake with body back", () => {
    const neutral = createRider("neutral", 0),
      front = createRider("front", 0),
      rear = createRider("rear", 0);
    for (const rider of [neutral, front, rear]) {
      rider.speed = 20;
      rider.input.brake = true;
    }
    front.input.body = 0.8;
    rear.input.body = -0.8;
    updateContext(neutral, 100, 0.016);
    updateContext(front, 100, 0.016);
    updateContext(rear, 100, 0.016);
    expect(brakeForce(front, 1)).toBeGreaterThan(brakeForce(neutral, 1));
    expect(brakeForce(rear, 1)).toBeLessThan(brakeForce(neutral, 1));
  });

  it("turns hard braking into a powerslide without a shoulder button", () => {
    const rider = createRider("slide", 0);
    Object.assign(rider, { speed: 22 });
    Object.assign(rider.input, { brake: true, steer: -1, body: 0 });
    updateContext(rider, 100, 0.016);
    expect(rider.powerslide).toBe(true);
    expect(rider.frontBrake).toBe(false);
  });

  it("queues a valid ground hop edge even if release arrives before the next tick", () => {
    const rider = createRider("hop-edge", 0);
    rider.speed = 12;
    const press = { ...rider.input, jump: true };
    registerJumpEdge(rider, press);
    expect(rider.jumpQueued).toBe(true);
    rider.input = { ...press, jump: false };
    expect(rider.jumpQueued).toBe(true);
  });

  it("chains directional air styles from input edges and banks them only on a clean landing", () => {
    const rider = createRider("style", 0);
    rider.grounded = false;
    const left = { ...rider.input, steer: -1, jump: true };
    registerJumpEdge(rider, left);
    rider.input = left;
    expect(rider.currentTrick).toBe("LEFT SPIN");
    expect(rider.combo).toBe(1);
    rider.input = { ...rider.input, jump: false };
    const front = { ...rider.input, steer: 0, body: 1, jump: true };
    registerJumpEdge(rider, front);
    rider.input = front;
    expect(rider.currentTrick).toBe("FRONT ARC");
    expect(rider.trickFeedbackMs).toBe(850);
    expect(rider.combo).toBe(2);
    const pending = rider.pendingStyle;
    rider.grounded = true;
    resolveLanding(rider, true, false);
    expect(rider.score).toBe(pending);
    expect(rider.combo).toBe(0);
    expect(rider.pendingStyle).toBe(0);
    expect(rider.currentTrick).toBe("FRONT ARC");
    updateContext(rider, 2_000, 0.9);
    expect(rider.currentTrick).toBe("");
  });

  it("cancels pending style on a crash", () => {
    const rider = createRider("crash-style", 0);
    rider.grounded = false;
    const press = { ...rider.input, jump: true };
    registerJumpEdge(rider, press);
    rider.input = press;
    expect(rider.pendingStyle).toBeGreaterThan(0);
    rider.grounded = true;
    resolveLanding(rider, false, true);
    expect(rider.score).toBe(0);
    expect(rider.pendingStyle).toBe(0);
    expect(rider.combo).toBe(0);
    expect(rider.currentTrick).toBe("TABLE STYLE");
    expect(rider.trickFeedbackMs).toBeGreaterThan(0);
  });

  it("uses Y input edge for a close-range strike on the selected visual side", () => {
    const rider = createRider("attacker", 0),
      rival = createRider("rival", 1);
    Object.assign(rider, { lane: 0, progress: 100, speed: 20 });
    Object.assign(rival, { lane: 1.2, progress: 102, speed: 20 });
    const press = { ...rider.input, steer: -1, attack: true };
    registerAttackEdge(rider, press, [rider, rival]);
    rider.input = press;
    expect(rival.speed).toBeLessThan(20);
    expect(rival.lateralVelocity).toBeGreaterThan(0);
    expect(rider.score).toBe(50);
    expect(rival.hitFeedback).toBeGreaterThan(0);
  });

  it("turns body-back + Y into rear view instead of combat", () => {
    const rider = createRider("look", 0),
      rival = createRider("rival", 1);
    Object.assign(rider, { lane: 0, progress: 100, speed: 20 });
    Object.assign(rival, { lane: 1, progress: 101, speed: 20 });
    const press = { ...rider.input, body: -1, attack: true };
    registerAttackEdge(rider, press, [rider, rival]);
    rider.input = press;
    updateContext(rider, 100, 0.016);
    expect(rider.rearView).toBe(true);
    expect(rival.speed).toBe(20);
  });
});
