import { SURGE_COST } from "../shared/moves.js";
import type { ViewFighter } from "./model.js";
export function combatReadout(fighter: ViewFighter): string {
  if (fighter.hp <= 0) return "KNOCKOUT";
  if (fighter.juggle > 0 && fighter.airborne > 0) return `AIR COMBO ${fighter.juggle + 1} HITS`;
  if (fighter.blockStun > 0) return "GUARDING";
  if (fighter.stun > 0) return fighter.flash || "HIT STUN";
  if (fighter.meter >= SURGE_COST) return "SURGE READY · Y";
  return `${Math.ceil(fighter.hp)} HP · ${Math.floor(fighter.meter)} METER`;
}
