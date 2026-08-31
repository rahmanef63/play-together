export type CircuitId = "sunset-ring" | "harbor-bend" | "alpine-run";
export type CarId = "falcon-r" | "comet-gt" | "manta-rs";

export interface CircuitSpec {
  id: CircuitId;
  name: string;
  tagline: string;
  width: number;
  laps: number;
  palette: { sky: number; ground: number; road: number; accent: number };
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

export const DEFAULT_CIRCUIT: CircuitSpec = {
  id: "sunset-ring",
  name: "Sunset Ring",
  tagline: "Wide, fast, forgiving",
  width: 18,
  laps: 3,
  palette: { sky: 0xf3a36a, ground: 0x496a35, road: 0x303237, accent: 0xf3d05c },
};
export const CIRCUITS: CircuitSpec[] = [
  DEFAULT_CIRCUIT,
  {
    id: "harbor-bend",
    name: "Harbor Bend",
    tagline: "Technical dockside rhythm",
    width: 16,
    laps: 3,
    palette: { sky: 0x8fc8db, ground: 0x315861, road: 0x2a3035, accent: 0x59d3c7 },
  },
  {
    id: "alpine-run",
    name: "Alpine Run",
    tagline: "Long sweepers and elevation feel",
    width: 17,
    laps: 2,
    palette: { sky: 0xbad8ef, ground: 0x496643, road: 0x34363a, accent: 0xe7ede8 },
  },
];
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
  const c = Math.cos(t);
  const s = Math.sin(t);
  if (circuit.id === "harbor-bend") {
    return { x: 62 * c + 8 * Math.cos(2 * t), z: 36 * s + 5 * Math.sin(2 * t) };
  }
  if (circuit.id === "alpine-run") {
    return { x: 70 * c + 7 * Math.sin(3 * t), z: 42 * s + 5 * Math.sin(2 * t) };
  }
  return { x: 66 * c, z: 40 * s };
}

const cache = new Map<string, TrackPoint[]>();
export function sampleCircuit(circuit: CircuitSpec, count = 160): TrackPoint[] {
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

export function circuitCheckpoints(circuit: CircuitSpec, count = 8) {
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
  const forwardX = Math.sin(start.heading);
  const forwardZ = Math.cos(start.heading);
  const rightX = Math.cos(start.heading);
  const rightZ = -Math.sin(start.heading);
  const back = 4 + row * 5.2;
  return {
    x: start.x - forwardX * back + rightX * lane,
    z: start.z - forwardZ * back + rightZ * lane,
    heading: start.heading,
  };
}

function pointAt<T>(items: T[], index: number): T {
  const item = items[wrapIndex(index, items.length)];
  if (item === undefined) throw new Error("Circuit sample is empty");
  return item;
}
