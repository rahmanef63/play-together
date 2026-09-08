import type { Racer, TurboState } from "./model.js";

type Standing = Pick<Racer, "id" | "x" | "z" | "lap" | "nextCheckpoint" | "finishMs">;
export function raceOrder<T extends Standing>(
  racers: readonly T[],
  track: TurboState["track"],
): T[] {
  const count = track.checkpoints.length;
  const progress = (r: Standing) => {
    const next = track.checkpoints[r.nextCheckpoint];
    const previous = track.checkpoints[(r.nextCheckpoint + count - 1) % count];
    if (!next || !previous) return 0;
    const dx = next.x - previous.x,
      dz = next.z - previous.z;
    const squared = dx * dx + dz * dz;
    return squared === 0
      ? 0
      : Math.max(0, Math.min(1, ((r.x - previous.x) * dx + (r.z - previous.z) * dz) / squared));
  };
  return [...racers].sort((a, b) => {
    if (a.finishMs !== null || b.finishMs !== null)
      return (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity) || a.id.localeCompare(b.id);
    return (
      b.lap * count + b.nextCheckpoint - (a.lap * count + a.nextCheckpoint) ||
      progress(b) - progress(a) ||
      a.id.localeCompare(b.id)
    );
  });
}
