import type { Plane, SkyState } from "./model.js";
export function incomingThreat(state: SkyState, me: Plane): string {
  if (state.phase !== "dogfight" || me.respawnMs > 0) return "";
  const threats = state.shots.filter((shot) => shot.kind === "missile" && shot.targetId === me.id);
  if (!threats.length) return "";
  const distance = Math.min(
    ...threats.map((shot) => Math.hypot(shot.x - me.x, shot.y - me.y, shot.z - me.z)),
  );
  return `MISSILE INBOUND · ${Math.round(distance)} m · BREAK TURN`;
}
