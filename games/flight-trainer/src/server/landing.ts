export interface LandingAircraft {
  x: number;
  y: number;
  z: number;
  pitch: number;
  roll: number;
  airspeed: number;
  verticalSpeed: number;
  gearDown: boolean;
  airborne: boolean;
  landed: boolean;
  landingScored: boolean;
  crashed: boolean;
  missionComplete: boolean;
  nextCheckpoint: number;
  score: number;
  elapsedMs: number;
}

/** Remember airborne state until actual ground contact, including low-height frames. */
export function resolveGroundContact(
  aircraft: LandingAircraft,
  runway: { width: number; zMin: number; zMax: number },
  checkpointCount: number,
): void {
  if (aircraft.y > 1.2) return;
  if (aircraft.airborne) {
    const onRunway =
      Math.abs(aircraft.x) <= runway.width / 2 &&
      aircraft.z >= runway.zMin &&
      aircraft.z <= runway.zMax;
    const safe =
      onRunway &&
      aircraft.gearDown &&
      Math.abs(aircraft.verticalSpeed) < 6.2 &&
      aircraft.airspeed < 37 &&
      Math.abs(aircraft.roll) < 0.24 &&
      Math.abs(aircraft.pitch) < 0.3;
    if (!safe) {
      aircraft.crashed = true;
      aircraft.airspeed = 0;
    } else {
      aircraft.landed = true;
      if (!aircraft.landingScored) {
        aircraft.score += 250;
        aircraft.landingScored = true;
      }
      if (aircraft.nextCheckpoint >= checkpointCount && !aircraft.missionComplete) {
        aircraft.missionComplete = true;
        aircraft.airspeed = 0;
        aircraft.score += Math.max(0, 600 - Math.floor(aircraft.elapsedMs / 1000));
      }
    }
  }
  aircraft.airborne = false;
  aircraft.y = 1.2;
  aircraft.verticalSpeed = 0;
}
