import type { Aircraft, FlightState } from "./model.js";
export function flightCoach(me: Aircraft, state: FlightState): string {
  if (me.crashed || me.missionComplete) return "";
  if (me.stall) return "STALL · LOWER NOSE / ADD THROTTLE";
  const checkpoint = state.checkpoints[me.nextCheckpoint];
  if (checkpoint) {
    const distance = Math.round(
      Math.hypot(checkpoint.x - me.x, checkpoint.y - me.y, checkpoint.z - me.z),
    );
    const altitude = Math.round(checkpoint.y - me.y);
    return `${checkpoint.label} ${distance} m · ${Math.abs(altitude) <= 5 ? "HOLD ALTITUDE" : altitude > 0 ? `CLIMB ${altitude} m` : `DESCEND ${-altitude} m`}`;
  }
  if (!me.gearDown) return "LANDING · LOWER GEAR";
  if (Math.abs(me.roll) >= 0.24) return "LANDING · LEVEL WINGS";
  if (me.airspeed >= 37) return "LANDING · REDUCE SPEED BELOW 72 kt";
  if (Math.abs(me.verticalSpeed) >= 6.2) return "LANDING · SOFTEN DESCENT";
  if (Math.abs(me.pitch) >= 0.3) return "LANDING · LEVEL NOSE";
  const onRunway =
    Math.abs(me.x - state.runway.x) <= state.runway.width / 2 &&
    me.z >= state.runway.zMin &&
    me.z <= state.runway.zMax;
  return onRunway ? "LANDING · HOLD A GENTLE DESCENT" : "LANDING · ALIGN WITH RUNWAY";
}
