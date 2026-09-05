import { carById, clamp, trackById } from "../shared/catalog.js";
import {
  featurePoses,
  gridPose,
  nearestTrackPoint,
  trackCorridorInfo,
} from "../shared/trackMath.js";
import type { Racer, RaceState } from "./raceModel.js";

export function updateHumanDriver(racer: Racer, state: RaceState, dt: number) {
  const track = trackById(state.trackId),
    car = carById(racer.carId),
    input = racer.input;
  tickTimers(racer, dt);
  racer.scraping = false;
  if (racer.spinTimer > 0) {
    racer.heading += 9.5 * dt;
    racer.speed *= Math.max(0.2, 1 - 2.2 * dt);
    move(racer, dt);
    racer.wrongWay = false;
    racer.wrongWayTimer = 0;
    return;
  }
  const steerTarget = Math.abs(input.steer) < 0.07 ? 0 : input.steer;
  racer.steering += (steerTarget - racer.steering) * (1 - Math.exp(-10 * dt));
  const nearestBefore = nearestTrackPoint(track, racer.x, racer.z),
    onTrack = nearestBefore.distance <= track.width * 0.55;
  const coinFactor = 1 + Math.min(10, racer.coins) * 0.008,
    boosted = racer.boostTimer > 0 && input.throttle > 0 && input.brake === 0,
    drag = onTrack ? 1.2 + racer.speed * 0.032 : 5.4 + racer.speed * 0.09;
  const accel =
      input.throttle * car.accel +
      (boosted ? car.boostPower : 0) -
      input.brake * car.braking -
      drag,
    top = (car.topSpeed + (boosted ? 10 : 0)) * coinFactor;
  racer.speed = clamp(racer.speed + accel * dt, 0, top);
  updateDrift(racer, dt);
  const speedRatio = clamp(racer.speed / car.topSpeed, 0, 1),
    grip = car.handling * (1.12 - speedRatio * 0.34),
    driftSteer = racer.drifting ? 1.38 : 1;
  racer.heading -= racer.steering * 2.06 * grip * driftSteer * clamp(racer.speed / 6, 0, 1) * dt;
  move(racer, dt);
  enforceTrack(racer, state, dt);
  updateWrongWay(racer, state, dt);
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
  racer.invulnerableTimer = 2.8;
  racer.driftTime = 0;
  racer.driftTier = 0;
  racer.drifting = false;
  racer.scraping = false;
  racer.wrongWay = false;
  racer.wrongWayTimer = 0;
  racer.rescueCooldown = 2.5;
}
function tickTimers(r: Racer, dt: number) {
  r.boostTimer = Math.max(0, r.boostTimer - dt);
  r.spinTimer = Math.max(0, r.spinTimer - dt);
  r.invulnerableTimer = Math.max(0, r.invulnerableTimer - dt);
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
    corridor = trackCorridorInfo(track, r.x, r.z),
    max = track.width / 2 - 1.2;
  if (Math.abs(corridor.lateral) <= max) return;
  const sign = Math.sign(corridor.lateral) || 1;
  r.x = corridor.x + corridor.rightX * sign * max;
  r.z = corridor.z + corridor.rightZ * sign * max;
  const diff = Math.atan2(
      Math.sin(corridor.heading - r.heading),
      Math.cos(corridor.heading - r.heading),
    ),
    align = Math.min(0.35, dt * 5.5),
    retention = 0.74 + 0.24 * Math.abs(Math.cos(diff));
  r.heading += diff * align;
  r.speed = Math.max(0, r.speed * retention);
  r.scraping = true;
}
function updateWrongWay(r: Racer, state: RaceState, dt: number) {
  const corridor = trackCorridorInfo(trackById(state.trackId), r.x, r.z),
    alignment = Math.sin(r.heading) * corridor.forwardX + Math.cos(r.heading) * corridor.forwardZ;
  if (alignment < -0.45 && r.speed > 7) {
    r.wrongWayTimer += dt;
    r.wrongWay = r.wrongWayTimer > 0.6;
  } else {
    r.wrongWay = false;
    r.wrongWayTimer = 0;
  }
}
function move(r: Racer, dt: number) {
  r.x += Math.sin(r.heading) * r.speed * dt;
  r.z += Math.cos(r.heading) * r.speed * dt;
}
export function resetRacerToGrid(r: Racer, state: RaceState, slot: number) {
  Object.assign(r, gridPose(trackById(state.trackId), slot));
  Object.assign(r, {
    speed: 0,
    lap: 0,
    nextCheckpoint: 1,
    finished: false,
    finishMs: null,
    steering: 0,
    coins: 0,
    item: null,
    boostTimer: 0,
    driftTime: 0,
    driftTier: 0,
    drifting: false,
    draftTimer: 0,
    drafting: false,
    spinTimer: 0,
    invulnerableTimer: 0,
    rescueCooldown: 0,
    scraping: false,
    wrongWay: false,
    wrongWayTimer: 0,
  });
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
