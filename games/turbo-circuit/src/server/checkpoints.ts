import { trackById } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
import type { Racer, RaceState } from "./raceModel.js";

/** A lap ends at checkpoint zero, after every preceding checkpoint was visited in order. */
export function advanceCheckpoint(
  state: RaceState,
  racer: Racer,
  previous: { x: number; z: number },
) {
  if (racer.finished) return;
  const checkpoints = state.track.checkpoints;
  const target = checkpoints[racer.nextCheckpoint];
  if (
    !target ||
    Math.hypot(racer.x - target.x, racer.z - target.z) > Math.max(10, state.track.width * 0.72)
  )
    return;
  const crossedFinish = racer.nextCheckpoint === 0;
  if (crossedFinish) {
    const start = sampleTrack(trackById(state.trackId))[0];
    if (!start) return;
    const forward = (point: { x: number; z: number }) =>
      (point.x - start.x) * Math.sin(start.heading) + (point.z - start.z) * Math.cos(start.heading);
    if (forward(previous) >= 0 || forward(racer) < 0) return;
  }
  racer.nextCheckpoint = (racer.nextCheckpoint + 1) % checkpoints.length;
  if (!crossedFinish) return;
  racer.lap += 1;
  if (racer.lap < state.lapsToWin) return;
  racer.finished = true;
  racer.finishMs = state.raceMs;
  state.winnerId ??= racer.id;
}
