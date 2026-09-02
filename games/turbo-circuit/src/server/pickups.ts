import { trackById } from "../shared/catalog.js";
import { featurePoses } from "../shared/trackMath.js";
import type { ItemType, Pickup, Racer, RaceState } from "./raceModel.js";
export function createPickups(trackId: string): Pickup[] {
  const track = trackById(trackId),
    coins = featurePoses(track, track.features.coinRows, [-5.5, 0, 5.5]),
    boxes = featurePoses(track, track.features.itemBoxes, [-5.2, 0, 5.2]);
  return [
    ...coins.map((p, index) => ({
      id: `coin-${index}`,
      type: "coin" as const,
      x: p.x,
      z: p.z,
      active: true,
      respawnMs: 0,
    })),
    ...boxes.map((p, index) => ({
      id: `item-${index}`,
      type: "item" as const,
      x: p.x,
      z: p.z,
      active: true,
      respawnMs: 0,
    })),
  ];
}
export function tickPickups(state: RaceState, ms: number) {
  for (const pickup of state.pickups) {
    if (pickup.active) continue;
    pickup.respawnMs = Math.max(0, pickup.respawnMs - ms);
    if (pickup.respawnMs === 0) pickup.active = true;
  }
}
export function collectPickups(state: RaceState, racer: Racer, nextItem: () => ItemType) {
  for (const pickup of state.pickups) {
    if (!pickup.active || Math.hypot(racer.x - pickup.x, racer.z - pickup.z) > 2.8) continue;
    if (pickup.type === "coin") {
      racer.coins = Math.min(10, racer.coins + 1);
      pickup.respawnMs = 5200;
    } else {
      if (!racer.item) racer.item = nextItem();
      pickup.respawnMs = 7600;
    }
    pickup.active = false;
  }
}
export function deterministicItem(seed: number): ItemType {
  const value = Math.abs(Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1;
  return value < 0.34 ? "BOOST" : value < 0.69 ? "PULSE" : "MINE";
}
