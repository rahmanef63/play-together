import {
  DROP_LIPS,
  gradeDegrees,
  JUMP_ZONES,
  laneCenter,
  trailHalfWidth,
} from "../shared/course.js";
import type { RiderView, RidgeViewState } from "./model.js";
export function ridingCoach(state: RidgeViewState, me?: RiderView): string {
  if (!me || state.phase !== "racing" || me.finishedAt !== null) return "";
  if (me.crashed > 0) return "RECOVERING · RELEASE CONTROLS";
  if (!me.grounded)
    return me.pendingStyle > 0 ? "LAND CLEANLY TO BANK STYLE" : "AIRBORNE · LEVEL THE BIKE";
  const offset = me.lane - laneCenter(me.progress, me.lane);
  if (Math.abs(offset) > trailHalfWidth(me.progress, me.lane) * 0.8)
    return offset > 0 ? "TRAIL EDGE · STEER RIGHT" : "TRAIL EDGE · STEER LEFT";
  const lookAhead = Math.max(20, me.speed * 2);
  const drop = DROP_LIPS.find(
    (zone) => zone.start > me.progress && zone.start - me.progress < lookAhead,
  );
  if (drop) return `DROP IN ${Math.round(drop.start - me.progress)} m · CONTROL SPEED`;
  const ramp = JUMP_ZONES.find(
    (zone) => zone.start > me.progress && zone.start - me.progress < lookAhead,
  );
  if (ramp) return `JUMP IN ${Math.round(ramp.start - me.progress)} m · X TO HOP`;
  if (me.stamina < 20) return "LOW STAMINA · RELEASE A TO RECOVER";
  if (gradeDegrees(me.progress) > 30) return "STEEP DESCENT · B TO CONTROL SPEED";
  return "DOUBLE-TAP + HOLD A TO SPRINT";
}
