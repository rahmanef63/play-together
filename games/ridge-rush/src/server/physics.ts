import {
  CHECKPOINTS,
  checkpointReached,
  courseCrossSlope,
  courseGrip,
  courseRolling,
  courseSlope,
  FINISH_PROGRESS,
  jumpAt,
  lateralError,
  missedCheckpoint,
  surfaceSpeedFactor,
  trailHalfWidth,
} from "../shared/course.js";
import {
  brakeForce,
  pedalForce,
  resolveLanding,
  startTrick,
  tryAttack,
  updateContext,
} from "./mechanics.js";
import { clamp, type Rider } from "./model.js";
import { advanceVertical, groundHeight, groundPitch } from "./vertical.js";

const GRAVITY = 9.81,
  MAX_SPEED = 42;
export interface AdvanceResult {
  checkpoint: boolean;
  crashed: boolean;
  finished: boolean;
}
export function advanceRider(
  rider: Rider,
  dt: number,
  elapsedMs: number,
  rivals: Rider[] = [],
): AdvanceResult {
  updateContext(rider, elapsedMs, dt);
  startTrick(rider);
  tryAttack(rider, rivals);
  const result = { checkpoint: false, crashed: false, finished: false };
  if (rider.finishedAt !== null) return result;
  if (!rider.input.jump) rider.jumpReady = true;
  if (rider.crashed > 0) return recoverCrash(rider, dt, result);
  updateLeanAndLateral(rider, dt);
  updateForwardSpeed(rider, dt);
  const previousProgress = rider.progress,
    previousGround = groundHeight(previousProgress, rider.lane);
  rider.progress += rider.speed * surfaceSpeedFactor(rider.progress, rider.lane) * dt;
  const vertical = advanceVertical(
    rider,
    dt,
    previousProgress,
    previousGround,
    groundHeight(rider.progress, rider.lane),
  );
  if (vertical.crashed) {
    crashRider(rider);
    resolveLanding(rider, false, true);
    result.crashed = true;
    return result;
  }
  resolveLanding(rider, vertical.landed, vertical.crashed);
  const error = lateralError(rider.progress, rider.lane),
    width = trailHalfWidth(rider.progress, rider.lane);
  rider.offTrailMs =
    error > width ? rider.offTrailMs + dt * 1000 : Math.max(0, rider.offTrailMs - dt * 1300);
  if (error > width) rider.speed *= Math.max(0.68, 1 - dt * 2.4);
  if (
    error > width + (width < 4 ? 0.75 : 1.45) ||
    rider.offTrailMs > (width < 4 ? 260 : 440) ||
    missedCheckpoint(rider.progress, rider.checkpoint)
  ) {
    crashRider(rider);
    resolveLanding(rider, false, true);
    result.crashed = true;
    return result;
  }
  if (checkpointReached(rider.progress, rider.lane, rider.checkpoint)) {
    rider.checkpoint += 1;
    rider.score += 120;
    result.checkpoint = true;
  }
  if (rider.progress >= FINISH_PROGRESS && rider.checkpoint === CHECKPOINTS.length) {
    rider.progress = FINISH_PROGRESS;
    rider.altitude = groundHeight(FINISH_PROGRESS, rider.lane);
    rider.finishedAt = elapsedMs;
    rider.speed = 0;
    rider.verticalSpeed = 0;
    rider.grounded = true;
    rider.score += Math.max(180, 1400 - Math.floor(elapsedMs / 100));
    result.finished = true;
  }
  return result;
}
function updateLeanAndLateral(rider: Rider, dt: number): void {
  const grip = courseGrip(rider.progress),
    target = clamp(-rider.input.steer, -1, 1);
  rider.lean += (target - rider.lean) * (1 - Math.exp(-9 * grip * dt));
  const camber = courseCrossSlope(rider.progress) * GRAVITY * 0.72;
  const slideGain = rider.powerslide ? 1.42 : 1;
  const steer = rider.lean * (2.8 + rider.speed * 0.16) * grip * slideGain;
  const damping = (2.6 + grip * 1.8) * (rider.powerslide ? 0.42 : 1);
  rider.lateralVelocity += (steer + camber - rider.lateralVelocity * damping) * dt;
  rider.lane += rider.lateralVelocity * dt;
}
function updateForwardSpeed(rider: Rider, dt: number): void {
  const input = rider.input,
    slope = rider.grounded ? courseSlope(rider.progress) : 0,
    grip = courseGrip(rider.progress);
  const gravityAlong = rider.grounded ? -GRAVITY * Math.sin(Math.atan(slope)) : 0;
  const effort = clamp(rider.stamina / 28, 0.34, 1),
    pedalRoom = clamp(1 - rider.speed / MAX_SPEED, 0.18, 1);
  const pedal = pedalForce(rider, pedalRoom, effort);
  const brake = brakeForce(rider, grip);
  const tucked = input.body > 0.5 && !input.brake;
  const rolling = rider.grounded ? courseRolling(rider.progress) : 0.08;
  const aero = rider.speed * rider.speed * (tucked ? 0.00105 : 0.00185);
  rider.speed = clamp(
    rider.speed + (gravityAlong + pedal - brake - rolling - aero) * dt,
    0,
    MAX_SPEED,
  );
  const working = input.pedal && rider.speed > 13;
  rider.stamina = clamp(
    rider.stamina + (rider.sprinting ? -22 : working ? -8 : input.pedal ? -2 : 12) * dt,
    0,
    100,
  );
}
export function crashRider(rider: Rider): void {
  rider.crashed = 1.35;
  rider.speed = 0;
  rider.lateralVelocity = 0;
  rider.verticalSpeed = 0;
  rider.grounded = true;
  rider.altitude = groundHeight(rider.progress, rider.lane);
  rider.pitch = groundPitch(rider.progress, rider.lane);
  rider.airTimeMs = 0;
  rider.offTrailMs = 0;
  rider.rescueCount += 1;
  rider.score = Math.max(0, rider.score - 35);
  rider.sprintMs = 0;
  rider.sprinting = false;
  rider.powerslide = false;
  rider.currentTrick = "";
  rider.pendingStyle = 0;
  rider.combo = 0;
}
export function rescueRider(rider: Rider): void {
  const checkpoint = rider.checkpoint > 0 ? CHECKPOINTS[rider.checkpoint - 1] : 0;
  rider.progress = Math.max(0, (checkpoint ?? 0) + (rider.checkpoint > 0 ? 7 : 0));
  rider.lane = 0;
  rider.speed = 5;
  rider.lateralVelocity = 0;
  rider.lean = 0;
  rider.verticalSpeed = 0;
  rider.grounded = true;
  rider.altitude = groundHeight(rider.progress, rider.lane);
  rider.pitch = groundPitch(rider.progress, rider.lane);
  rider.airTimeMs = 0;
  rider.offTrailMs = 0;
}
export function updateBotInput(rider: Rider, seed: number): void {
  const personality = ((seed * 17 + rider.slot * 13) % 31) / 31,
    shortcut = rider.progress >= 1530 && rider.progress <= 1810 && personality > 0.45;
  const targetLane = shortcut ? 5.25 : Math.sin(rider.progress * 0.009 + rider.slot) * 0.62,
    ramp = jumpAt(rider.progress + 8);
  rider.input.steer = clamp((rider.lane - targetLane) * 0.42, -0.88, 0.88);
  rider.input.body = !rider.grounded ? -0.18 : courseSlope(rider.progress) < -0.32 ? 0.58 : 0.08;
  rider.input.pedal = true;
  rider.input.brake =
    Math.abs(rider.lane - targetLane) > 2 ||
    (courseGrip(rider.progress) < 0.72 && rider.speed > 24);
  rider.input.jump = Boolean(ramp) && rider.jumpReady && rider.speed > 11;
  rider.input.attack = false;
}
function recoverCrash(rider: Rider, dt: number, result: AdvanceResult): AdvanceResult {
  rider.crashed = Math.max(0, rider.crashed - dt);
  rider.stamina = clamp(rider.stamina + dt * 10, 0, 100);
  if (rider.crashed === 0) rescueRider(rider);
  return result;
}
