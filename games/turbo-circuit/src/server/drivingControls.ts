import type { Racer } from "./raceModel.js";

/** Brake plus a turn is the Tier-0 handbrake; a straight brake remains a full stop. */
export function wantsDrift(racer: Racer) {
  return (
    (racer.input.drift || racer.input.brake > 0.5) &&
    Math.abs(racer.steering) > 0.25 &&
    racer.speed > 13
  );
}
export function updateDrift(racer: Racer, dt: number) {
  if (wantsDrift(racer)) {
    racer.drifting = true;
    racer.driftTime += dt;
    racer.driftTier = racer.driftTime > 1.3 ? 2 : racer.driftTime > 0.58 ? 1 : 0;
    return;
  }
  if (racer.drifting && racer.driftTier > 0)
    racer.boostTimer = Math.max(racer.boostTimer, racer.driftTier === 2 ? 2.1 : 1.05);
  racer.drifting = false;
  racer.driftTime = 0;
  racer.driftTier = 0;
}
export function wantsRecovery(racer: Racer, dt: number) {
  const holding = racer.input.brake > 0.5 && racer.input.throttle === 0 && racer.speed < 2;
  racer.recoveryHold = holding ? (racer.recoveryHold ?? 0) + dt : 0;
  return racer.recoveryHold >= 1 && racer.rescueCooldown <= 0;
}
