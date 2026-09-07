import type { Racer, RaceState } from "./raceModel.js";
/** Trigger on the gas edge, not on repeated held snapshots. Brake always wins. */
export function updateCruise(
  racer: Racer,
  phase: RaceState["phase"],
  previousThrottle: number,
): void {
  if (phase !== "racing" && phase !== "countdown") {
    racer.cruiseActive = false;
    return;
  }
  if (racer.input.brake > 0) racer.cruiseActive = false;
  else if (racer.input.throttle > 0 && previousThrottle <= 0) racer.cruiseActive = true;
}
