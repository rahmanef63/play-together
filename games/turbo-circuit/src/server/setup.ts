import {
  CARS,
  DEFAULT_CAR,
  DEFAULT_TRACK,
  TRACKS,
  trackById,
  wrapIndex,
} from "../shared/catalog.js";
import { trackCheckpoints } from "../shared/trackMath.js";
import { resetRacerToGrid } from "./kartMechanics.js";
import type { Racer, RaceState } from "./raceModel.js";
export function applySetupInput(state: RaceState, racer: Racer) {
  if (Math.abs(racer.input.steer) < 0.3) racer.menuXActive = false;
  if (Math.abs(racer.input.menuY) < 0.3) racer.menuYActive = false;
  if (Math.abs(racer.input.steer) > 0.52 && !racer.menuXActive) {
    racer.menuXActive = true;
    const index = CARS.findIndex((car) => car.id === racer.carId);
    racer.carId =
      CARS[wrapIndex(index + Math.sign(racer.input.steer), CARS.length)]?.id ?? DEFAULT_CAR.id;
    racer.ready = false;
  }
  const humans = state.racers.filter((item) => !item.bot),
    leader = humans[0];
  if (leader?.id === racer.id && Math.abs(racer.input.menuY) > 0.52 && !racer.menuYActive) {
    racer.menuYActive = true;
    const index = TRACKS.findIndex((track) => track.id === state.trackId);
    setTrack(
      state,
      TRACKS[wrapIndex(index + Math.sign(racer.input.menuY), TRACKS.length)]?.id ??
        DEFAULT_TRACK.id,
    );
    for (const human of humans) human.ready = false;
  }
}
export function setTrack(state: RaceState, trackId: string) {
  const track = trackById(trackId);
  state.trackId = track.id;
  state.lapsToWin = track.laps;
  state.track = {
    id: track.id,
    name: track.name,
    width: track.width,
    checkpoints: trackCheckpoints(track),
  };
  resetGrid(state);
}
export function resetGrid(state: RaceState) {
  const humans = state.racers.filter((r) => !r.bot),
    bots = state.racers.filter((r) => r.bot);
  for (const [index, racer] of [...humans, ...bots].entries())
    resetRacerToGrid(racer, state, index);
  state.worldItems = [];
}
