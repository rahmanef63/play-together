import type { Plane, SkyState } from "./model.js";
export function targetGuide(state: SkyState, me: Plane): string {
  if (state.phase !== "dogfight" || me.respawnMs > 0) return "";
  const available = state.planes.filter((p) => p.id !== me.id && p.hp > 0 && p.respawnMs <= 0);
  const distance = (p: Plane) => Math.hypot(p.x - me.x, p.y - me.y, p.z - me.z);
  const lock = available.find((p) => p.id === me.lockId);
  const target =
    lock ??
    available.reduce<Plane | undefined>(
      (best, p) => (!best || distance(p) < distance(best) ? p : best),
      undefined,
    );
  if (!target) return "SCANNING FOR OPPONENTS";
  const delta = Math.atan2(target.x - me.x, target.z - me.z) - me.heading;
  const angle = (Math.atan2(Math.sin(delta), Math.cos(delta)) * 180) / Math.PI;
  const direction =
    Math.abs(angle) < 12
      ? "AHEAD"
      : `${angle > 0 ? "← LEFT" : "RIGHT →"} ${Math.round(Math.abs(angle))}°`;
  const altitude = target.y - me.y;
  const vertical = Math.abs(altitude) < 10 ? "LEVEL" : altitude > 0 ? "ABOVE" : "BELOW";
  return `${lock ? "LOCK" : "TARGET"} ${Math.round(distance(target))} m · ${direction} · ${vertical}`;
}
