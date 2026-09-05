import {
  BIKE_GROUND_OFFSET,
  courseElevation,
  courseSlope,
  isDropLip,
  jumpAt,
} from "../shared/course.js";
import { clamp, type Rider } from "./model.js";

const GRAVITY = 9.81;

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
  if (rider.grounded) return advanceGrounded(rider, previousProgress, previousGround, nextGround);
  return advanceAirborne(rider, dt, nextGround);
}

export function groundHeight(progress: number): number {
  return courseElevation(progress) + BIKE_GROUND_OFFSET;
}

function advanceGrounded(
  rider: Rider,
  previousProgress: number,
  previousGround: number,
  nextGround: number,
): VerticalResult {
  const ramp = jumpAt(rider.progress);
  const manualJump = rider.input.jump && rider.jumpReady && rider.speed > 6;
  const dropLaunch =
    isDropLip(rider.progress) && rider.speed > 12 && nextGround < previousGround - 0.1;
  if (!manualJump && !dropLaunch) {
    rider.altitude = nextGround;
    rider.verticalSpeed = 0;
    rider.airTimeMs = 0;
    return { crashed: false, launched: false, landed: false };
  }
  const tangentVelocity = courseSlope(previousProgress) * rider.speed;
  const bodyLift = Math.max(0, rider.input.body) * 1.1;
  rider.verticalSpeed = tangentVelocity + (manualJump ? (ramp?.impulse ?? 3.1) + bodyLift : 0);
  rider.altitude = Math.max(nextGround + 0.04, previousGround);
  rider.grounded = false;
  rider.airTimeMs = 0;
  if (manualJump) {
    rider.jumpReady = false;
    rider.stamina = clamp(rider.stamina - (ramp ? 4 : 2), 0, 100);
  }
  return { crashed: false, launched: true, landed: false };
}

function advanceAirborne(rider: Rider, dt: number, ground: number): VerticalResult {
  rider.verticalSpeed -= GRAVITY * dt;
  rider.altitude += rider.verticalSpeed * dt;
  rider.airTimeMs += dt * 1000;
  if (rider.altitude > ground) return { crashed: false, launched: false, landed: false };
  const impact = Math.max(0, -rider.verticalSpeed);
  rider.altitude = ground;
  rider.verticalSpeed = 0;
  rider.grounded = true;
  const landingRisk =
    impact * 0.1 + Math.abs(rider.lean) * 0.55 + Math.max(0, -rider.input.body) * 0.3;
  const crashed = impact > 12 || (impact > 7.5 && landingRisk > 1.15);
  if (!crashed) rider.score += Math.min(40, Math.floor(rider.airTimeMs / 120));
  rider.airTimeMs = 0;
  return { crashed, launched: false, landed: true };
}
