import {
  BIKE_GROUND_OFFSET,
  courseCrossSlope,
  courseElevation,
  courseSlope,
  isDropLip,
  jumpAt,
} from "../shared/course.js";
import { clamp, type Rider } from "./model.js";

const GRAVITY = 9.81,
  HALF_WHEELBASE = 0.72;
export interface VerticalResult {
  crashed: boolean;
  launched: boolean;
  landed: boolean;
}
export function advanceVertical(
  rider: Rider,
  dt: number,
  previousProgress: number,
  previousGround: number,
  nextGround: number,
): VerticalResult {
  return rider.grounded
    ? advanceGrounded(rider, previousProgress, previousGround, nextGround, dt)
    : advanceAirborne(rider, dt, nextGround);
}
export function groundHeight(progress: number, lane = 0): number {
  return courseElevation(progress) + lane * courseCrossSlope(progress) + BIKE_GROUND_OFFSET;
}
export function groundPitch(progress: number, lane = 0): number {
  const rear = groundHeight(progress - HALF_WHEELBASE, lane),
    front = groundHeight(progress + HALF_WHEELBASE, lane);
  return Math.atan2(front - rear, HALF_WHEELBASE * 2);
}
function advanceGrounded(
  rider: Rider,
  previousProgress: number,
  previousGround: number,
  nextGround: number,
  dt: number,
): VerticalResult {
  const ramp = jumpAt(rider.progress),
    manual = (rider.jumpQueued || rider.input.jump) && rider.jumpReady && rider.speed > 7;
  const travelled = Math.max(0.01, rider.progress - previousProgress);
  const expected = previousGround + courseSlope(previousProgress) * travelled;
  const terrainFallsAway = nextGround < expected - 0.16;
  const drop = (isDropLip(rider.progress) || terrainFallsAway) && rider.speed > 11;
  updateSuspension(rider, dt);
  if (!manual && !drop) {
    rider.altitude = nextGround;
    rider.verticalSpeed = 0;
    rider.airTimeMs = 0;
    rider.pitch = approach(rider.pitch, groundPitch(rider.progress, rider.lane), 12, dt);
    return { crashed: false, launched: false, landed: false };
  }
  const tangent = courseSlope(previousProgress) * rider.speed;
  const preload = Math.max(0, -rider.input.body) * 1.25;
  rider.verticalSpeed = tangent + (manual ? (ramp?.impulse ?? 4.8) + preload : 0);
  rider.altitude = Math.max(nextGround + 0.05, previousGround);
  rider.grounded = false;
  rider.airTimeMs = 0;
  rider.suspensionFront = 0;
  rider.suspensionRear = 0;
  if (manual) {
    rider.jumpQueued = false;
    rider.jumpReady = false;
    rider.stamina = clamp(rider.stamina - (ramp ? 4 : 2), 0, 100);
  }
  return { crashed: false, launched: true, landed: false };
}
function advanceAirborne(rider: Rider, dt: number, ground: number): VerticalResult {
  rider.verticalSpeed -= GRAVITY * dt;
  rider.altitude += rider.verticalSpeed * dt;
  rider.airTimeMs += dt * 1000;
  rider.pitch = clamp(rider.pitch - rider.input.body * 1.15 * dt, -1.25, 1.1);
  if (rider.altitude > ground) return { crashed: false, launched: false, landed: false };
  const impact = Math.max(0, -rider.verticalSpeed),
    targetPitch = groundPitch(rider.progress, rider.lane),
    angle = Math.abs(rider.pitch - targetPitch);
  rider.altitude = ground;
  rider.verticalSpeed = 0;
  rider.grounded = true;
  const weightPenalty =
    Math.max(0, rider.input.body) * 0.18 + Math.max(0, -rider.input.body) * 0.08;
  const crashed =
    impact > 14.5 || (impact > 8.5 && (angle > 0.68 || Math.abs(rider.lean) > 0.9 + weightPenalty));
  if (!crashed) rider.score += Math.min(80, Math.floor(rider.airTimeMs / 90));
  rider.pitch = targetPitch;
  rider.airTimeMs = 0;
  updateSuspension(rider, dt, true);
  return { crashed, launched: false, landed: true };
}
function updateSuspension(rider: Rider, dt: number, landing = false): void {
  const rear = groundHeight(rider.progress - HALF_WHEELBASE, rider.lane),
    center = groundHeight(rider.progress, rider.lane),
    front = groundHeight(rider.progress + HALF_WHEELBASE, rider.lane);
  const rough = clamp(Math.abs(front + rear - center * 2) * 2.2, 0, 1);
  const speedLoad = clamp(rider.speed / 36, 0, 1) * rough;
  const frontTarget = clamp(
    speedLoad + Math.max(0, rider.input.body) * 0.28 + (landing ? 0.38 : 0),
    0,
    1,
  );
  const rearTarget = clamp(
    speedLoad + Math.max(0, -rider.input.body) * 0.25 + (landing ? 0.3 : 0),
    0,
    1,
  );
  rider.suspensionFront = approach(rider.suspensionFront, frontTarget, landing ? 18 : 10, dt);
  rider.suspensionRear = approach(rider.suspensionRear, rearTarget, landing ? 18 : 10, dt);
}
function approach(value: number, target: number, rate: number, dt: number): number {
  return value + (target - value) * (1 - Math.exp(-rate * dt));
}
