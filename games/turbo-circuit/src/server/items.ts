import { trackById } from "../shared/catalog.js";
import { trackCorridorInfo } from "../shared/trackMath.js";
import type { Racer, RaceState, WorldItem } from "./raceModel.js";

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
    fz = Math.cos(racer.heading) * sign,
    offset = item === "MINE" ? 3.2 : 3.8;
  state.worldItems.push({
    id: `wi-${++itemId}`,
    type: item === "PULSE" ? "pulse" : "mine",
    x: racer.x + fx * offset,
    z: racer.z + fz * offset,
    vx: item === "PULSE" ? fx * 58 : 0,
    vz: item === "PULSE" ? fz * 58 : 0,
    ownerId: racer.id,
    ttlMs: item === "PULSE" ? 3600 : 10000,
    armMs: 40,
    bounces: 0,
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
    if (item.type === "pulse") bouncePulse(item, track.width, state.trackId);
    if (item.armMs > 0) continue;
    const victim = state.racers.find(
      (r) =>
        r.id !== item.ownerId &&
        !r.finished &&
        r.spinTimer <= 0 &&
        r.invulnerableTimer <= 0 &&
        Math.hypot(r.x - item.x, r.z - item.z) < 2.7,
    );
    if (victim) {
      hitRacer(victim);
      item.ttlMs = 0;
    }
  }
  state.worldItems = state.worldItems.filter((item) => item.ttlMs > 0);
}
function bouncePulse(item: WorldItem, width: number, trackId: RaceState["trackId"]) {
  const track = trackById(trackId),
    corridor = trackCorridorInfo(track, item.x, item.z),
    max = width / 2 - 1;
  if (Math.abs(corridor.lateral) <= max) return;
  if (item.bounces >= 4) {
    item.ttlMs = 0;
    return;
  }
  const sign = Math.sign(corridor.lateral) || 1,
    nx = corridor.rightX * sign,
    nz = corridor.rightZ * sign,
    dot = item.vx * nx + item.vz * nz;
  item.vx -= 2 * dot * nx;
  item.vz -= 2 * dot * nz;
  item.x = corridor.x + corridor.rightX * sign * max;
  item.z = corridor.z + corridor.rightZ * sign * max;
  item.bounces += 1;
}
function hitRacer(racer: Racer) {
  racer.spinTimer = 1.3;
  racer.invulnerableTimer = 2.8;
  racer.speed *= 0.25;
  racer.boostTimer = 0;
  racer.coins = Math.max(0, racer.coins - 2);
}
