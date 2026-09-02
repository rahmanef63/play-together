import { carById, clamp, trackById } from "../shared/catalog.js";
import { featurePoses, gridPose, nearestTrackPoint } from "../shared/trackMath.js";
import type { Racer, RaceState } from "./raceModel.js";
export function updateHumanDriver(racer: Racer, state: RaceState, dt: number) {
  const track = trackById(state.trackId),
    car = carById(racer.carId),
    input = racer.input;
  tickTimers(racer, dt);
  if (racer.spinTimer > 0) {
    racer.heading += 9.5 * dt;
    racer.speed *= Math.max(0.2, 1 - 2.2 * dt);
    move(racer, dt);
    return;
  }
  const steerTarget = Math.abs(input.steer) < 0.07 ? 0 : input.steer;
  racer.steering += (steerTarget - racer.steering) * (1 - Math.exp(-10 * dt));
  const nearestBefore = nearestTrackPoint(track, racer.x, racer.z),
    onTrack = nearestBefore.distance <= track.width * 0.64;
  const coinFactor = 1 + Math.min(10, racer.coins) * 0.008;
  const boosted = racer.boostTimer > 0;
  const drag = onTrack ? 1.2 + racer.speed * 0.032 : 5.4 + racer.speed * 0.09;
  const accel =
    input.throttle * car.accel + (boosted ? car.boostPower : 0) - input.brake * car.braking - drag;
  const top = (car.topSpeed + (boosted ? 10 : 0)) * coinFactor;
  racer.speed = clamp(racer.speed + accel * dt, 0, top);
  updateDrift(racer, dt);
  const speedRatio = clamp(racer.speed / car.topSpeed, 0, 1),
    grip = car.handling * (1.12 - speedRatio * 0.34);
  const driftSteer = racer.drifting ? 1.38 : 1;
  racer.heading -= racer.steering * 2.06 * grip * driftSteer * clamp(racer.speed / 6, 0, 1) * dt;
  move(racer, dt);
  enforceTrack(racer, state, dt);
  updateDrafting(racer, state, dt);
  applyBoostPad(racer, state);
}
export function rescueRacer(racer: Racer, state: RaceState) {
  if (racer.rescueCooldown > 0) return;
  const track = trackById(state.trackId),
    nearest = nearestTrackPoint(track, racer.x, racer.z);
  racer.x = nearest.x;
  racer.z = nearest.z;
  racer.heading = nearest.heading;
  racer.speed = 0;
  racer.spinTimer = 0;
  racer.driftTime = 0;
  racer.driftTier = 0;
  racer.drifting = false;
  racer.rescueCooldown = 2.5;
}
function tickTimers(r: Racer, dt: number) {
  r.boostTimer = Math.max(0, r.boostTimer - dt);
  r.spinTimer = Math.max(0, r.spinTimer - dt);
  r.rescueCooldown = Math.max(0, r.rescueCooldown - dt);
}
function updateDrift(r: Racer, dt: number) {
  const wants = r.input.drift && Math.abs(r.steering) > 0.18 && r.speed > 13;
  if (wants) {
    r.drifting = true;
    r.driftTime += dt;
    r.driftTier = r.driftTime > 1.3 ? 2 : r.driftTime > 0.58 ? 1 : 0;
    return;
  }
  if (r.drifting) {
    if (r.driftTier === 2) r.boostTimer = Math.max(r.boostTimer, 2.1);
    else if (r.driftTier === 1) r.boostTimer = Math.max(r.boostTimer, 1.05);
  }
  r.drifting = false;
  r.driftTime = 0;
  r.driftTier = 0;
}
function updateDrafting(r: Racer, state: RaceState, dt: number) {
  const fx = Math.sin(r.heading),
    fz = Math.cos(r.heading),
    rx = Math.cos(r.heading),
    rz = -Math.sin(r.heading);
  const target = state.racers.find((other) => {
    if (other.id === r.id || other.finished) return false;
    const dx = other.x - r.x,
      dz = other.z - r.z,
      d = Math.hypot(dx, dz);
    return d > 3 && d < 15 && dx * fx + dz * fz > 4 && Math.abs(dx * rx + dz * rz) < 3.3;
  });
  if (target && r.speed > 16 && r.boostTimer <= 0) {
    r.drafting = true;
    r.draftTimer += dt;
    if (r.draftTimer >= 1.25) {
      r.boostTimer = 1.75;
      r.draftTimer = 0;
      r.drafting = false;
    }
  } else {
    r.draftTimer = Math.max(0, r.draftTimer - dt * 1.7);
    r.drafting = r.draftTimer > 0;
  }
}
function applyBoostPad(r: Racer, state: RaceState) {
  const track = trackById(state.trackId);
  for (const pad of featurePoses(track, track.features.boostPads, [0]))
    if (Math.hypot(r.x - pad.x, r.z - pad.z) < 4.2) {
      r.boostTimer = Math.max(r.boostTimer, 1.35);
      break;
    }
}
function enforceTrack(r: Racer, state: RaceState, dt: number) {
  const track = trackById(state.trackId),
    near = nearestTrackPoint(track, r.x, r.z);
  if (near.distance <= track.width * 0.72) return;
  const hard = near.distance > track.width * 1.8;
  r.x += (near.x - r.x) * (hard ? 2.4 : 0.9) * dt;
  r.z += (near.z - r.z) * (hard ? 2.4 : 0.9) * dt;
  r.speed *= Math.max(0.48, 1 - (hard ? 1.6 : 0.7) * dt);
}
function move(r: Racer, dt: number) {
  r.x += Math.sin(r.heading) * r.speed * dt;
  r.z += Math.cos(r.heading) * r.speed * dt;
}
export function resetRacerToGrid(r: Racer, state: RaceState, slot: number) {
  Object.assign(r, gridPose(trackById(state.trackId), slot));
  r.speed = 0;
  r.lap = 0;
  r.nextCheckpoint = 1;
  r.finished = false;
  r.finishMs = null;
  r.steering = 0;
  r.coins = 0;
  r.item = null;
  r.boostTimer = 0;
  r.driftTime = 0;
  r.driftTier = 0;
  r.drifting = false;
  r.draftTimer = 0;
  r.drafting = false;
  r.spinTimer = 0;
  r.rescueCooldown = 0;
  r.input = {
    ...r.input,
    steer: 0,
    menuY: 0,
    throttle: 0,
    brake: 0,
    drift: false,
    rearView: false,
  };
}
