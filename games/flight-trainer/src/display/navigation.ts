import type { Aircraft, FlightState } from "./model.js";
export function flightNavigation(me: Aircraft, state: FlightState): string {
  if (me.crashed) return "START · RESTART FLIGHT";
  if (me.missionComplete) return "MISSION COMPLETE · START TO FLY AGAIN";
  const checkpoint = state.checkpoints[me.nextCheckpoint];
  const target = checkpoint ?? {
    x: state.runway.x,
    z: (state.runway.zMin + state.runway.zMax) / 2,
  };
  const dx = target.x - me.x,
    dz = target.z - me.z;
  const angle = Math.atan2(dx, dz) - me.heading;
  const degrees = (Math.atan2(Math.sin(angle), Math.cos(angle)) * 180) / Math.PI;
  const direction =
    Math.hypot(dx, dz) < 8
      ? "ON TARGET"
      : Math.abs(degrees) < 8
        ? "STRAIGHT AHEAD"
        : `${degrees > 0 ? "← LEFT" : "RIGHT →"} ${Math.round(Math.abs(degrees))}°`;
  const progress = checkpoint
    ? `GATE ${me.nextCheckpoint + 1}/${state.checkpoints.length}`
    : "RETURN TO RUNWAY";
  return `${progress} · ${direction}`;
}
