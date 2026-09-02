import type { KartAction } from "./controlInput.js";
import { useHeldItem } from "./items.js";
import { rescueRacer } from "./kartMechanics.js";
import type { Racer, RaceState } from "./raceModel.js";
import { requestRematch } from "./rematch.js";

export interface KartActionResult {
  resetRaceClock: boolean;
}

export function applyKartAction(
  state: RaceState,
  racer: Racer,
  action: KartAction | null,
): KartActionResult {
  if (!action) return { resetRaceClock: false };
  if (action.type === "start") return applyStart(state, racer);
  if (action.type === "ready") return applyReady(state, racer);
  if (action.type === "camera") racer.cameraMode = nextCamera(racer.cameraMode);
  else if (action.type === "rescue" && state.phase === "racing") rescueRacer(racer, state);
  else if (action.type === "item" && state.phase === "racing")
    useHeldItem(state, racer, action.direction);
  else if (action.type === "pause" && state.phase !== "setup" && state.phase !== "finished")
    state.paused = !state.paused;
  return { resetRaceClock: false };
}

function applyStart(state: RaceState, racer: Racer): KartActionResult {
  if (state.phase === "setup") {
    racer.ready = true;
    return { resetRaceClock: false };
  }
  if (state.phase === "finished") return applyReady(state, racer);
  state.paused = !state.paused;
  return { resetRaceClock: false };
}

function applyReady(state: RaceState, racer: Racer): KartActionResult {
  if (state.phase === "setup") {
    racer.ready = true;
    return { resetRaceClock: false };
  }
  if (state.phase === "finished" && requestRematch(state, racer)) return { resetRaceClock: true };
  return { resetRaceClock: false };
}

function nextCamera(mode: Racer["cameraMode"]): Racer["cameraMode"] {
  const modes: Racer["cameraMode"][] = ["chase", "wide", "driver", "bumper"];
  return modes[(modes.indexOf(mode) + 1) % modes.length] ?? "chase";
}
