import { createPickups } from "./pickups.js";
import type { Racer, RaceState } from "./raceModel.js";
import { resetGrid } from "./setup.js";

export function requestRematch(state: RaceState, racer: Racer) {
  racer.ready = true;
  const humans = state.racers.filter((item) => !item.bot);
  if (humans.length === 0 || !humans.every((item) => item.ready)) return false;
  resetGrid(state);
  state.pickups = createPickups(state.trackId);
  state.worldItems = [];
  state.winnerId = null;
  state.phase = "countdown";
  state.countdownMs = 3000;
  state.raceMs = 0;
  return true;
}

export function finishRaceIfComplete(state: RaceState) {
  const humans = state.racers.filter((item) => !item.bot);
  if (humans.length === 0 || !humans.every((item) => item.finished)) return false;
  state.phase = "finished";
  for (const human of humans) human.ready = false;
  return true;
}
