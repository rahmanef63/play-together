import { LANE_REACH, moveData, SURGE_COST } from "../shared/moves.js";
import type { ViewFighter } from "./model.js";
export function spacingCoach(me: ViewFighter, foe?: ViewFighter): string {
  if (!foe || me.hp <= 0 || foe.hp <= 0 || me.stun > 0 || me.blockStun > 0 || me.airborne > 0)
    return "";
  if (me.move) {
    const move = moveData[me.move as keyof typeof moveData];
    if (!move) return "";
    return me.moveFrame < move.start
      ? "WIND-UP"
      : `RECOVERY ${Math.max(0, move.end - me.moveFrame)}f`;
  }
  if (Math.abs(me.lane - foe.lane) > LANE_REACH) return "ALIGN WITH OPPONENT";
  const distance = Math.abs(me.x - foe.x);
  if (distance <= moveData.throw.range) return "CLOSE · A+B THROW";
  if (distance <= moveData.jab.range) return "JAB RANGE · A";
  if (distance <= moveData.kick.range) return "KICK RANGE · B";
  if (me.meter >= SURGE_COST && distance <= moveData.special.range) return "SURGE RANGE · Y";
  return "MOVE CLOSER · HOLD AWAY TO GUARD";
}
