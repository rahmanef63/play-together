import { CARS, carById, clamp, trackById } from "../shared/catalog.js";
import { nearestTrackPoint, sampleTrack } from "../shared/trackMath.js";
import { emptyInput, type Racer, type RaceState } from "./raceModel.js";
export function createBot(index: number, seed: number, trackId: string): Racer {
  const track = trackById(trackId),
    chaos = seeded(seed * 17 + index * 97 + 11),
    car = CARS[(index + 1) % CARS.length] ?? CARS.at(0);
  const start = sampleTrack(track).at(0);
  if (!car || !start) throw new Error("Kart catalog is empty");
  return {
    id: `ai-${index + 1}`,
    name: ["CPU RAVEN", "CPU VELA", "CPU KITE"][index] ?? `CPU ${index + 1}`,
    bot: true,
    carId: car.id,
    ready: true,
    cameraMode: "chase",
    rearView: false,
    x: start.x,
    z: start.z,
    heading: start.heading,
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
    menuXActive: false,
    menuYActive: false,
    input: emptyInput(),
    brain: {
      chaos: clamp(chaos, 0.08, 0.92),
      chaosTarget: clamp(chaos, 0.08, 0.92),
      chaosTimer: 0.35 + seeded(seed + index * 83) * 0.55,
      skill: 0.72 + seeded(seed + index * 31) * 0.22,
      laneBias: (seeded(seed + index * 47) - 0.5) * track.width * 0.34,
      aggression: 0.35 + seeded(seed + index * 71) * 0.55,
    },
  };
}
export function updateBotDriver(racer: Racer, state: RaceState, dt: number) {
  const brain = racer.brain;
  if (!brain) return;
  const track = trackById(state.trackId),
    car = carById(racer.carId),
    samples = sampleTrack(track),
    near = nearestTrackPoint(track, racer.x, racer.z);
  racer.boostTimer = Math.max(0, racer.boostTimer - dt);
  racer.spinTimer = Math.max(0, racer.spinTimer - dt);
  racer.invulnerableTimer = Math.max(0, racer.invulnerableTimer - dt);
  racer.scraping = false;
  racer.wrongWay = false;
  racer.wrongWayTimer = 0;
  if (racer.spinTimer > 0) {
    racer.heading += 9 * dt;
    racer.speed *= Math.max(0.2, 1 - 2 * dt);
    move(racer, dt);
    return;
  }
  brain.chaosTimer -= dt;
  if (brain.chaosTimer <= 0) {
    brain.chaosTarget = clamp(3.88 * brain.chaosTarget * (1 - brain.chaosTarget), 0.02, 0.98);
    brain.chaosTimer = 0.3 + brain.chaosTarget * 0.72;
  }
  brain.chaos += (brain.chaosTarget - brain.chaos) * (1 - Math.exp(-2.4 * dt));
  const look = 5 + Math.round(clamp(racer.speed / 9, 0, 5)),
    target = at(samples, near.index + look),
    future = at(samples, near.index + look + 8);
  const lane = clamp(
      brain.laneBias + (brain.chaos - 0.5) * track.width * 0.22,
      -track.width * 0.31,
      track.width * 0.31,
    ),
    rx = Math.cos(target.heading),
    rz = -Math.sin(target.heading);
  const desired = Math.atan2(target.x + rx * lane - racer.x, target.z + rz * lane - racer.z),
    delta = Math.atan2(Math.sin(desired - racer.heading), Math.cos(desired - racer.heading));
  racer.steering = clamp(-delta / 0.7, -1, 1);
  const curve = Math.abs(
    Math.atan2(
      Math.sin(future.heading - target.heading),
      Math.cos(future.heading - target.heading),
    ),
  );
  const targetSpeed =
    car.topSpeed * (0.7 + brain.skill * 0.23) * (1 - clamp(curve * 0.45, 0, 0.3)) +
    (brain.chaos - 0.5) * 5 +
    rubberBandBonus(racer, state, samples, near.index);
  const wantsBoost = brain.chaos > 0.9 && curve < 0.13 && racer.speed > 15;
  racer.boostTimer = wantsBoost ? Math.max(racer.boostTimer, 0.7) : racer.boostTimer;
  const accel = racer.speed < targetSpeed ? car.accel * 0.78 : -car.braking * 0.34;
  racer.speed = clamp(
    racer.speed + (accel + (racer.boostTimer > 0 ? car.boostPower : 0)) * dt,
    7,
    car.topSpeed + 8,
  );
  racer.drifting = curve > 0.16 && racer.speed > 20;
  racer.driftTier = racer.drifting ? (curve > 0.28 ? 2 : 1) : 0;
  racer.heading -= racer.steering * 1.9 * car.handling * (racer.drifting ? 1.18 : 1) * dt;
  move(racer, dt);
  const after = nearestTrackPoint(track, racer.x, racer.z);
  if (after.distance > track.width * 0.68) {
    racer.x += (after.x - racer.x) * 1.6 * dt;
    racer.z += (after.z - racer.z) * 1.6 * dt;
    racer.speed *= 1 - 0.58 * dt;
  }
}
export function rubberBandBonus(
  racer: Racer,
  state: RaceState,
  samples = sampleTrack(trackById(state.trackId)),
  botIndex = nearestTrackPoint(trackById(state.trackId), racer.x, racer.z).index,
) {
  const humans = state.racers.filter((item) => !item.bot && !item.finished);
  if (humans.length === 0 || samples.length === 0) return 0;
  const botProgress = racer.lap + botIndex / samples.length,
    leader = Math.max(
      ...humans.map((human) => {
        const index = nearestTrackPoint(trackById(state.trackId), human.x, human.z).index;
        return human.lap + index / samples.length;
      }),
    ),
    gap = leader - botProgress;
  if (gap > 0.12) return clamp((gap - 0.12) * 16, 0, 12);
  if (gap < -0.15) return clamp((gap + 0.15) * 10, -6, 0);
  return 0;
}
function move(r: Racer, dt: number) {
  r.x += Math.sin(r.heading) * r.speed * dt;
  r.z += Math.cos(r.heading) * r.speed * dt;
}
function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}
function at<T>(items: T[], index: number): T {
  const item = items[((index % items.length) + items.length) % items.length];
  if (item === undefined) throw new Error("Bot racing line is empty");
  return item;
}
