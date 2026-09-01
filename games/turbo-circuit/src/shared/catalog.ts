import { REAL_CIRCUITS } from "./realCircuits.js";

export type CircuitId = "sepang" | "monza" | "interlagos";
export type CarId = "falcon-r" | "comet-gt" | "manta-rs";

export interface CircuitSpec {
  id: CircuitId;
  name: string;
  shortName: string;
  location: string;
  tagline: string;
  lengthKm: number;
  corners: number;
  direction: "clockwise" | "anti-clockwise";
  width: number;
  laps: number;
  palette: { sky: number; ground: number; road: number; accent: number };
  controlPoints: Array<readonly [number, number]>;
}
export interface CarSpec {
  id: CarId;
  name: string;
  trait: string;
  color: number;
  topSpeed: number;
  accel: number;
  handling: number;
  braking: number;
  nitroPower: number;
}
export interface TrackPoint {
  x: number;
  z: number;
  heading: number;
  index: number;
}

export const CIRCUITS = REAL_CIRCUITS;
export const DEFAULT_CIRCUIT = required(REAL_CIRCUITS[0], "Default circuit missing");
export const DEFAULT_CAR: CarSpec = {
  id: "falcon-r",
  name: "Falcon R",
  trait: "Balanced",
  color: 0xe34245,
  topSpeed: 46,
  accel: 25,
  handling: 1,
  braking: 38,
  nitroPower: 14,
};
export const CARS: CarSpec[] = [
  DEFAULT_CAR,
  {
    id: "comet-gt",
    name: "Comet GT",
    trait: "Top speed",
    color: 0x3578d4,
    topSpeed: 51,
    accel: 22.5,
    handling: 0.88,
    braking: 34,
    nitroPower: 17,
  },
  {
    id: "manta-rs",
    name: "Manta RS",
    trait: "Grip + acceleration",
    color: 0xe7b932,
    topSpeed: 44,
    accel: 28,
    handling: 1.16,
    braking: 41,
    nitroPower: 13,
  },
];

export const circuitById = (id: string) =>
  CIRCUITS.find((item) => item.id === id) ?? DEFAULT_CIRCUIT;
export const carById = (id: string) => CARS.find((item) => item.id === id) ?? DEFAULT_CAR;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const wrapIndex = (value: number, length: number) => ((value % length) + length) % length;

export function centerAt(circuit: CircuitSpec, t: number): { x: number; z: number } {
  const points = circuit.controlPoints;
  const scaled = ((((t / (Math.PI * 2)) % 1) + 1) % 1) * points.length;
  const index = Math.floor(scaled);
  const u = scaled - index;
  const p0 = pointAt(points, index - 1);
  const p1 = pointAt(points, index);
  const p2 = pointAt(points, index + 1);
  const p3 = pointAt(points, index + 2);
  return { x: catmull(p0[0], p1[0], p2[0], p3[0], u), z: catmull(p0[1], p1[1], p2[1], p3[1], u) };
}

const cache = new Map<string, TrackPoint[]>();
export function sampleCircuit(circuit: CircuitSpec, count = 180): TrackPoint[] {
  const key = `${circuit.id}:${count}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const raw = Array.from({ length: count }, (_, index) => ({
    ...centerAt(circuit, (index / count) * Math.PI * 2),
    index,
  }));
  const points = raw.map((point, index) => {
    const prev = pointAt(raw, index - 1);
    const next = pointAt(raw, index + 1);
    return { ...point, heading: Math.atan2(next.x - prev.x, next.z - prev.z) };
  });
  cache.set(key, points);
  return points;
}

export function nearestTrackPoint(
  circuit: CircuitSpec,
  x: number,
  z: number,
): TrackPoint & { distance: number } {
  let best = pointAt(sampleCircuit(circuit), 0);
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of sampleCircuit(circuit)) {
    const distance = Math.hypot(x - point.x, z - point.z);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return { ...best, distance: bestDistance };
}

export function circuitCheckpoints(circuit: CircuitSpec, count = 10) {
  const points = sampleCircuit(circuit);
  return Array.from({ length: count }, (_, index) => {
    const point = pointAt(points, Math.floor((index / count) * points.length));
    return { x: point.x, z: point.z };
  });
}

export function gridPose(circuit: CircuitSpec, slot: number) {
  const start = pointAt(sampleCircuit(circuit), 0);
  const row = Math.floor(slot / 2);
  const lane = slot % 2 === 0 ? -2.6 : 2.6;
  const forwardX = Math.sin(start.heading),
    forwardZ = Math.cos(start.heading);
  const rightX = Math.cos(start.heading),
    rightZ = -Math.sin(start.heading);
  const back = 4 + row * 5.2;
  return {
    x: start.x - forwardX * back + rightX * lane,
    z: start.z - forwardZ * back + rightZ * lane,
    heading: start.heading,
  };
}

function catmull(a: number, b: number, c: number, d: number, t: number) {
  const t2 = t * t,
    t3 = t2 * t;
  return (
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  );
}
function pointAt<T>(items: T[], index: number): T {
  const item = items[wrapIndex(index, items.length)];
  if (item === undefined) throw new Error("Circuit sample is empty");
  return item;
}
function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
