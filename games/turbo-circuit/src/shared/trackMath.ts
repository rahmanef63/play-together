import type { TrackSpec } from "./catalog.js";
import { wrapIndex } from "./catalog.js";
export interface TrackPoint {
  x: number;
  z: number;
  heading: number;
  index: number;
}
const cache = new Map<string, TrackPoint[]>();
export function centerAt(track: TrackSpec, ratio: number) {
  const points = track.controlPoints;
  const scaled = (((ratio % 1) + 1) % 1) * points.length;
  const index = Math.floor(scaled),
    u = scaled - index;
  const p0 = pointAt(points, index - 1),
    p1 = pointAt(points, index),
    p2 = pointAt(points, index + 1),
    p3 = pointAt(points, index + 2);
  return { x: catmull(p0[0], p1[0], p2[0], p3[0], u), z: catmull(p0[1], p1[1], p2[1], p3[1], u) };
}
export function sampleTrack(track: TrackSpec, count = 180): TrackPoint[] {
  const key = `${track.id}:${count}`;
  const found = cache.get(key);
  if (found) return found;
  const raw = Array.from({ length: count }, (_, index) => ({
    ...centerAt(track, index / count),
    index,
  }));
  const result = raw.map((point, index) => {
    const prev = pointAt(raw, index - 1),
      next = pointAt(raw, index + 1);
    return { ...point, heading: Math.atan2(next.x - prev.x, next.z - prev.z) };
  });
  cache.set(key, result);
  return result;
}
export function nearestTrackPoint(track: TrackSpec, x: number, z: number) {
  let best = pointAt(sampleTrack(track), 0),
    distance = Infinity;
  for (const point of sampleTrack(track)) {
    const d = Math.hypot(x - point.x, z - point.z);
    if (d < distance) {
      best = point;
      distance = d;
    }
  }
  return { ...best, distance };
}
export function trackCheckpoints(track: TrackSpec, count = 12) {
  const points = sampleTrack(track);
  return Array.from({ length: count }, (_, index) => {
    const p = pointAt(points, Math.floor((index / count) * points.length));
    return { x: p.x, z: p.z };
  });
}
export function gridPose(track: TrackSpec, slot: number) {
  const start = pointAt(sampleTrack(track), 0),
    row = Math.floor(slot / 2),
    lane = slot % 2 === 0 ? -2.7 : 2.7;
  const fx = Math.sin(start.heading),
    fz = Math.cos(start.heading),
    rx = Math.cos(start.heading),
    rz = -Math.sin(start.heading),
    back = 5 + row * 5.1;
  return {
    x: start.x - fx * back + rx * lane,
    z: start.z - fz * back + rz * lane,
    heading: start.heading,
  };
}
export function featurePoses(track: TrackSpec, ratios: number[], offsets: number[]) {
  const samples = sampleTrack(track, 240);
  return ratios.flatMap((ratio, featureIndex) => {
    const p = pointAt(samples, Math.round(ratio * samples.length));
    const rx = Math.cos(p.heading),
      rz = -Math.sin(p.heading);
    return offsets.map((offset, laneIndex) => ({
      id: featureIndex * 10 + laneIndex,
      x: p.x + rx * offset,
      z: p.z + rz * offset,
      heading: p.heading,
    }));
  });
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
  if (item === undefined) throw new Error("Track sample is empty");
  return item;
}
