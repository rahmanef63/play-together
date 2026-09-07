import { CHECKPOINTS, FINISH_PROGRESS } from "../shared/course.js";
export function checkpointGuide(progress: number, checkpoint: number): string {
  const target = CHECKPOINTS[checkpoint];
  const remaining = Math.max(0, Math.ceil((target ?? FINISH_PROGRESS) - progress));
  return target === undefined
    ? `FINISH ${remaining} m`
    : `CP ${checkpoint + 1}/${CHECKPOINTS.length} · ${remaining} m`;
}
