import {
  CARS,
  carById,
  circuitById,
  clamp,
  DEFAULT_CAR,
  gridPose,
  nearestTrackPoint,
  sampleCircuit,
  wrapIndex,
} from "../shared/catalog.js";
import type { Racer, RaceState } from "./raceModel.js";

export function createBot(index: number, seed: number, circuitId: string): Racer {
  const circuit = circuitById(circuitId);
  const pose = gridPose(circuit, index + 4);
  const chaos = seededUnit(seed * 17 + index * 97 + 11);
  return {
    id: `ai-${index + 1}`,
    name: ["CPU RAVEN", "CPU VELA", "CPU KITE"][index] ?? `CPU ${index + 1}`,
    bot: true,
    carId: CARS[(index + 1) % CARS.length]?.id ?? DEFAULT_CAR.id,
    ready: true,
    autoDrive: true,
    cockpit: false,
    rearView: false,
    ...pose,
    speed: 0,
    lap: 0,
    nextCheckpoint: 1,
    nitro: 100,
    finished: false,
    finishMs: null,
    steering: 0,
    menuXActive: false,
    menuYActive: false,
    input: {
      steer: 0,
      menuY: 0,
      drive: true,
      brake: 0,
      boost: false,
      cockpit: false,
      rearView: false,
      pause: false,
    },
    brain: {
      chaos: clamp(chaos, 0.08, 0.92),
      chaosTarget: clamp(chaos, 0.08, 0.92),
      chaosTimer: 0.35 + seededUnit(seed + index * 83) * 0.55,
      skill: 0.72 + seededUnit(seed + index * 31) * 0.22,
      laneBias: (seededUnit(seed + index * 47) - 0.5) * circuit.width * 0.35,
      aggression: 0.35 + seededUnit(seed + index * 71) * 0.55,
    },
  };
}

export function updateBotDriver(racer: Racer, state: RaceState, dt: number) {
  const brain = racer.brain;
  if (!brain) return;
  const circuit = circuitById(state.circuitId);
  const car = carById(racer.carId);
  const samples = sampleCircuit(circuit);
  const nearest = nearestTrackPoint(circuit, racer.x, racer.z);
  brain.chaosTimer -= dt;
  if (brain.chaosTimer <= 0) {
    brain.chaosTarget = clamp(3.88 * brain.chaosTarget * (1 - brain.chaosTarget), 0.02, 0.98);
    brain.chaosTimer = 0.3 + brain.chaosTarget * 0.72;
  }
  brain.chaos += (brain.chaosTarget - brain.chaos) * (1 - Math.exp(-2.4 * dt));
  const lookAhead = 5 + Math.round(clamp(racer.speed / 9, 0, 5));
  const target = sampleAt(samples, nearest.index + lookAhead);
  const curvePoint = sampleAt(samples, nearest.index + lookAhead + 8);
  const laneNoise = (brain.chaos - 0.5) * circuit.width * 0.24;
  const lane = clamp(brain.laneBias + laneNoise, -circuit.width * 0.32, circuit.width * 0.32);
  const rightX = Math.cos(target.heading);
  const rightZ = -Math.sin(target.heading);
  const tx = target.x + rightX * lane;
  const tz = target.z + rightZ * lane;
  const desiredHeading = Math.atan2(tx - racer.x, tz - racer.z);
  const headingDelta = Math.atan2(
    Math.sin(desiredHeading - racer.heading),
    Math.cos(desiredHeading - racer.heading),
  );
  racer.steering = clamp(-headingDelta / 0.7, -1, 1);
  const curve = Math.abs(
    Math.atan2(
      Math.sin(curvePoint.heading - target.heading),
      Math.cos(curvePoint.heading - target.heading),
    ),
  );
  const chaosSpeed = (brain.chaos - 0.5) * 5.5;
  const targetSpeed =
    car.topSpeed * (0.7 + brain.skill * 0.22) * (1 - clamp(curve * 0.42, 0, 0.28)) + chaosSpeed;
  const wantsBoost = brain.chaos > 0.9 && curve < 0.13 && racer.nitro > 28 && racer.speed > 15;
  const accel = racer.speed < targetSpeed ? car.accel * 0.78 : -car.braking * 0.35;
  racer.speed = clamp(
    racer.speed + (accel + (wantsBoost ? car.nitroPower : 0)) * dt,
    7,
    car.topSpeed + 7,
  );
  racer.nitro = wantsBoost
    ? Math.max(0, racer.nitro - 21 * dt)
    : Math.min(100, racer.nitro + 5 * dt);
  const authority = car.handling * (1.05 - clamp(racer.speed / car.topSpeed, 0, 1) * 0.3);
  racer.heading -= racer.steering * 1.9 * authority * dt;
  racer.x += Math.sin(racer.heading) * racer.speed * dt;
  racer.z += Math.cos(racer.heading) * racer.speed * dt;
  const after = nearestTrackPoint(circuit, racer.x, racer.z);
  if (after.distance > circuit.width * 0.64) {
    racer.x += (after.x - racer.x) * 1.5 * dt;
    racer.z += (after.z - racer.z) * 1.5 * dt;
    racer.speed *= 1 - 0.55 * dt;
  }
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function sampleAt<T>(samples: T[], index: number): T {
  const sample = samples[wrapIndex(index, samples.length)];
  if (sample === undefined) throw new Error("Bot racing line is empty");
  return sample;
}
