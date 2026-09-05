import {
  CHECKPOINTS,
  checkpointReached,
  courseSlope,
  FINISH_PROGRESS,
  jumpAt,
  lateralError,
  missedCheckpoint,
  surfaceSpeedFactor,
  trailHalfWidth,
} from "../shared/course.js";
import { clamp, type Rider } from "./model.js";
import { advanceVertical, groundHeight } from "./vertical.js";

const GRAVITY = 9.81;
const MAX_SPEED = 34;

export interface AdvanceResult {
  checkpoint: boolean;
  crashed: boolean;
  finished: boolean;
}

export function advanceRider(rider: Rider, dt: number, elapsedMs: number): AdvanceResult {
  const result = { checkpoint: false, crashed: false, finished: false };
  rider.rearView = rider.input.rear;
  if (rider.finishedAt !== null) return result;
  if (!rider.input.jump) rider.jumpReady = true;
  if (rider.crashed > 0) return recoverCrash(rider, dt, result);

  updateLean(rider, dt);
  updateForwardSpeed(rider, dt);
  const previousProgress = rider.progress;
  const previousGround = groundHeight(previousProgress);
  const handling = (rider.input.tuck ? 0.72 : 1) * (1 - clamp(rider.speed / 60, 0, 0.25));
  rider.lane += rider.lean * (3.2 + rider.speed * 0.12) * handling * dt;
  rider.progress += rider.speed * surfaceSpeedFactor(rider.progress, rider.lane) * dt;
  const vertical = advanceVertical(
    rider,
    dt,
    previousProgress,
    previousGround,
    groundHeight(rider.progress),
  );
  if (vertical.crashed) {
    crashRider(rider);
    result.crashed = true;
    return result;
  }

  const error = lateralError(rider.progress, rider.lane);
  const width = trailHalfWidth(rider.progress, rider.lane);
  rider.offTrailMs =
    error > width ? rider.offTrailMs + dt * 1000 : Math.max(0, rider.offTrailMs - dt * 1400);
  if (error > width) rider.speed *= Math.max(0.75, 1 - dt * 1.8);
  if (
    error > width + 1.7 ||
    rider.offTrailMs > 420 ||
    missedCheckpoint(rider.progress, rider.checkpoint)
  ) {
    crashRider(rider);
    result.crashed = true;
    return result;
  }

  if (checkpointReached(rider.progress, rider.lane, rider.checkpoint)) {
    rider.checkpoint += 1;
    rider.score += 100;
    result.checkpoint = true;
  }
  if (rider.progress >= FINISH_PROGRESS && rider.checkpoint === CHECKPOINTS.length) {
    rider.progress = FINISH_PROGRESS;
    rider.altitude = groundHeight(FINISH_PROGRESS);
    rider.finishedAt = elapsedMs;
    rider.speed = 0;
    rider.verticalSpeed = 0;
    rider.grounded = true;
    rider.score += Math.max(120, 760 - Math.floor(elapsedMs / 100));
    result.finished = true;
  }
  return result;
}

function updateLean(rider: Rider, dt: number): void {
  const shoulder = Number(rider.input.right) - Number(rider.input.left);
  const target = clamp(rider.input.steer + shoulder * 0.48, -1, 1);
  rider.lean += (target - rider.lean) * (1 - Math.exp(-10 * dt));
}

function updateForwardSpeed(rider: Rider, dt: number): void {
  const input = rider.input;
  const sprinting = input.sprint && input.pedal && !input.brake && rider.stamina > 0.5;
  const slope = rider.grounded ? courseSlope(rider.progress) : 0;
  const gravityAlongTrail = rider.grounded ? -GRAVITY * Math.sin(Math.atan(slope)) : 0;
  const rough = rider.grounded ? roughness(rider.progress) : 0;
  const pedal = input.pedal && !input.brake ? 4.6 : 0;
  const sprint = sprinting ? 2.8 : 0;
  const brake = input.brake ? 10.5 : 0;
  const rolling = rider.grounded ? 0.72 + rough * 1.5 : 0.08;
  const aero = rider.speed * rider.speed * (input.tuck ? 0.00125 : 0.0019);
  rider.speed = clamp(
    rider.speed + (gravityAlongTrail + pedal + sprint - brake - rolling - aero) * dt,
    0,
    MAX_SPEED,
  );
  rider.stamina = clamp(rider.stamina + (sprinting ? -24 : input.pedal ? 7 : 14) * dt, 0, 100);
}

export function crashRider(rider: Rider): void {
  rider.crashed = 1.25;
  rider.speed = 0;
  rider.verticalSpeed = 0;
  rider.grounded = true;
  rider.altitude = groundHeight(rider.progress);
  rider.airTimeMs = 0;
  rider.offTrailMs = 0;
  rider.rescueCount += 1;
  rider.score = Math.max(0, rider.score - 25);
}

export function rescueRider(rider: Rider): void {
  const checkpoint = rider.checkpoint > 0 ? CHECKPOINTS[rider.checkpoint - 1] : 0;
  rider.progress = Math.max(0, (checkpoint ?? 0) + (rider.checkpoint > 0 ? 4 : 0));
  rider.lane = 0;
  rider.speed = 5;
  rider.lean = 0;
  rider.verticalSpeed = 0;
  rider.grounded = true;
  rider.altitude = groundHeight(rider.progress);
  rider.airTimeMs = 0;
  rider.offTrailMs = 0;
}

export function updateBotInput(rider: Rider, seed: number): void {
  const personality = ((seed * 17 + rider.slot * 13) % 31) / 31;
  const shortcut = rider.progress >= 560 && rider.progress <= 770 && personality > 0.36;
  const targetLane = shortcut ? 4.05 : Math.sin(rider.progress * 0.011 + rider.slot) * 0.7;
  const ramp = jumpAt(rider.progress + 4);
  rider.input.steer = clamp((targetLane - rider.lane) * 0.36, -0.9, 0.9);
  rider.input.body = !rider.grounded ? 0.32 : roughness(rider.progress) ? 0.38 : 0.06;
  rider.input.pedal = true;
  rider.input.brake =
    Math.abs(rider.lane - targetLane) > 2.3 || (roughness(rider.progress) > 0 && rider.speed > 22);
  rider.input.jump = Boolean(ramp) && rider.jumpReady && rider.speed > 10;
  rider.input.sprint = rider.stamina > 48 && !rider.input.brake && personality > 0.18;
  rider.input.tuck = rider.grounded && !rider.input.brake && courseSlope(rider.progress) < -0.08;
  rider.input.left = false;
  rider.input.right = false;
  rider.input.rear = false;
}

function recoverCrash(rider: Rider, dt: number, result: AdvanceResult): AdvanceResult {
  rider.crashed = Math.max(0, rider.crashed - dt);
  rider.stamina = clamp(rider.stamina + dt * 10, 0, 100);
  if (rider.crashed === 0) rescueRider(rider);
  return result;
}

function roughness(progress: number): number {
  return (progress >= 430 && progress <= 520) || (progress >= 880 && progress <= 945) ? 1 : 0;
}
