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
  if (rider.crashed > 0) {
    rider.crashed = Math.max(0, rider.crashed - dt);
    rider.stamina = clamp(rider.stamina + dt * 10, 0, 100);
    if (rider.crashed === 0) rescueRider(rider);
    return result;
  }

  const input = rider.input;
  const shoulder = Number(input.right) - Number(input.left);
  const targetLean = clamp(input.steer + shoulder * 0.48, -1, 1);
  rider.lean += (targetLean - rider.lean) * (1 - Math.exp(-10 * dt));
  const sprinting = input.sprint && input.pedal && !input.brake && rider.stamina > 0.5;
  const tucking = input.tuck && !input.brake;
  const slopeBoost = clamp(-courseSlope(rider.progress) * 12, -1.5, 4.5);
  const rough = rider.airborne > 0 ? 0 : roughness(rider.progress);
  const baseTarget = 10.5 + slopeBoost + (input.pedal ? 11.5 : 0) + (tucking ? 2.4 : 0);
  const targetSpeed = baseTarget + (sprinting ? 6.5 : 0) - (input.brake ? 17 : 0) - rough * 2.8;
  rider.speed = clamp(
    rider.speed + (targetSpeed - rider.speed) * (1 - Math.exp(-(input.brake ? 4 : 2) * dt)),
    0,
    30,
  );
  rider.stamina = clamp(rider.stamina + (sprinting ? -24 : input.pedal ? 8 : 14) * dt, 0, 100);

  const handling = (tucking ? 0.72 : 1) * (1 - clamp(rider.speed / 60, 0, 0.25));
  rider.lane += rider.lean * (3.2 + rider.speed * 0.12) * handling * dt;
  const previousAir = rider.airborne;
  rider.airborne = Math.max(0, rider.airborne - dt);
  const speedFactor = surfaceSpeedFactor(rider.progress, rider.lane);
  rider.progress += rider.speed * speedFactor * dt;

  if (input.jump && rider.jumpReady && previousAir === 0 && rider.speed > 7) {
    const ramp = jumpAt(rider.progress);
    rider.airTotal = ramp?.air ?? 0.3;
    rider.airborne = rider.airTotal;
    rider.speed = clamp(rider.speed + (ramp?.boost ?? 0.7), 0, 30);
    rider.stamina = clamp(rider.stamina - (ramp ? 4 : 2), 0, 100);
    rider.jumpReady = false;
  } else if (previousAir > 0 && rider.airborne === 0) {
    const landingRisk =
      Math.abs(rider.lean) +
      Math.max(0, rider.speed - 24) * 0.055 +
      Math.max(0, -input.body) * 0.35;
    if (landingRisk > 1.25) {
      crashRider(rider);
      result.crashed = true;
      return result;
    }
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
    rider.finishedAt = elapsedMs;
    rider.speed = 0;
    rider.score += Math.max(120, 760 - Math.floor(elapsedMs / 100));
    result.finished = true;
  }
  return result;
}

export function crashRider(rider: Rider): void {
  rider.crashed = 1.25;
  rider.speed = 0;
  rider.airborne = 0;
  rider.airTotal = 0;
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
  rider.offTrailMs = 0;
}

export function updateBotInput(rider: Rider, seed: number): void {
  const personality = ((seed * 17 + rider.slot * 13) % 31) / 31;
  const shortcut = rider.progress >= 560 && rider.progress <= 770 && personality > 0.36;
  const targetLane = shortcut ? 4.05 : Math.sin(rider.progress * 0.011 + rider.slot) * 0.7;
  const ramp = jumpAt(rider.progress + 4);
  rider.input.steer = clamp((targetLane - rider.lane) * 0.36, -0.9, 0.9);
  rider.input.body = roughness(rider.progress) ? 0.38 : 0.05;
  rider.input.pedal = true;
  rider.input.brake =
    Math.abs(rider.lane - targetLane) > 2.3 || (roughness(rider.progress) > 0 && rider.speed > 23);
  rider.input.jump =
    Boolean(ramp) || (roughness(rider.progress) > 0 && rider.jumpReady && rider.speed > 14);
  rider.input.sprint = rider.stamina > 48 && !rider.input.brake && personality > 0.18;
  rider.input.tuck = !rider.input.brake && rider.stamina < 45;
  rider.input.left = false;
  rider.input.right = false;
  rider.input.rear = false;
}

function roughness(progress: number): number {
  return (progress >= 430 && progress <= 520) || (progress >= 880 && progress <= 945) ? 1 : 0;
}
