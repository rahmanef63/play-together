import { trackById } from "../shared/catalog.js";
import { nearestTrackPoint } from "../shared/trackMath.js";
import type { Racer, RaceState } from "./raceModel.js";

let itemId = 0;
export function useHeldItem(state: RaceState, racer: Racer, direction: "forward" | "backward") {
  const item = racer.item;
  if (!item || racer.spinTimer > 0) return;
  racer.item = null;
  if (item === "BOOST") {
    racer.boostTimer = Math.max(racer.boostTimer, 2.25);
    return;
  }
  const sign = direction === "forward" ? 1 : -1,
    fx = Math.sin(racer.heading) * sign,
    fz = Math.cos(racer.heading) * sign;
  const offset = item === "MINE" ? 3.2 : 3.8;
  state.worldItems.push({
    id: `wi-${++itemId}`,
    type: item === "PULSE" ? "pulse" : "mine",
    x: racer.x + fx * offset,
    z: racer.z + fz * offset,
    vx: item === "PULSE" ? fx * 58 : 0,
    vz: item === "PULSE" ? fz * 58 : 0,
    ownerId: racer.id,
    ttlMs: item === "PULSE" ? 2600 : 10000,
    armMs: 40,
  });
}
export function updateWorldItems(state: RaceState, ms: number) {
  const dt = ms / 1000,
    track = trackById(state.trackId);
  for (const item of state.worldItems) {
    item.ttlMs -= ms;
    item.armMs = Math.max(0, item.armMs - ms);
    item.x += item.vx * dt;
    item.z += item.vz * dt;
    if (item.type === "pulse") {
      const near = nearestTrackPoint(track, item.x, item.z);
      if (near.distance > track.width * 0.9) item.ttlMs = 0;
    }
    if (item.armMs > 0) continue;
    const victim = state.racers.find(
      (r) =>
        r.id !== item.ownerId &&
        !r.finished &&
        r.spinTimer <= 0 &&
        Math.hypot(r.x - item.x, r.z - item.z) < 2.7,
    );
    if (victim) {
      victim.spinTimer = 1.15;
      victim.speed *= 0.45;
      victim.boostTimer = 0;
      item.ttlMs = 0;
    }
  }
  state.worldItems = state.worldItems.filter((item) => item.ttlMs > 0);
}
