export const COURSE_LENGTH = 1180;
export const CHECKPOINTS = [175, 375, 590, 820, 1040] as const;
export const FINISH_PROGRESS = 1160;
export const MAIN_HALF_WIDTH = 5.4;
export const SHORTCUT_START = 575;
export const SHORTCUT_END = 770;
export const SHORTCUT_CENTER = 4.1;
export const SHORTCUT_HALF_WIDTH = 1.8;
export const JUMP_ZONES = [
  { start: 286, end: 308, air: 0.62, boost: 1.8 },
  { start: 706, end: 730, air: 0.78, boost: 2.4 },
  { start: 968, end: 988, air: 0.54, boost: 1.4 },
] as const;

export function clampProgress(value: number): number {
  return Math.max(0, Math.min(COURSE_LENGTH, value));
}

export function centerLine(progress: number): number {
  const p = clampProgress(progress);
  return Math.sin(p * 0.013) * 2.6 + Math.sin(p * 0.0047 + 0.8) * 1.4;
}

export function courseElevation(progress: number): number {
  const p = clampProgress(progress);
  return 49 - p * 0.037 + Math.sin(p * 0.018) * 1.4 + Math.sin(p * 0.006) * 2.2;
}

export function courseSlope(progress: number): number {
  const p = clampProgress(progress);
  const before = courseElevation(Math.max(0, p - 1));
  const after = courseElevation(Math.min(COURSE_LENGTH, p + 1));
  return (after - before) * 0.5;
}

export function courseHeading(progress: number): number {
  const p = clampProgress(progress);
  const before = centerLine(Math.max(0, p - 1));
  const after = centerLine(Math.min(COURSE_LENGTH, p + 1));
  return Math.atan2(after - before, 2);
}

export function inShortcut(progress: number, lane: number): boolean {
  return (
    progress >= SHORTCUT_START &&
    progress <= SHORTCUT_END &&
    Math.abs(lane - SHORTCUT_CENTER) <= SHORTCUT_HALF_WIDTH
  );
}

export function trailHalfWidth(progress: number, lane: number): number {
  return inShortcut(progress, lane) ? SHORTCUT_HALF_WIDTH : MAIN_HALF_WIDTH;
}

export function laneCenter(progress: number, lane: number): number {
  return inShortcut(progress, lane) ? SHORTCUT_CENTER : 0;
}

export function lateralError(progress: number, lane: number): number {
  return Math.abs(lane - laneCenter(progress, lane));
}

export function surfaceSpeedFactor(progress: number, lane: number): number {
  if (inShortcut(progress, lane)) return 1.08;
  const edge = Math.abs(lane) / MAIN_HALF_WIDTH;
  return edge > 0.82 ? 0.9 : 1;
}

export function jumpAt(progress: number) {
  return JUMP_ZONES.find((zone) => progress >= zone.start && progress <= zone.end) ?? null;
}

export function missedCheckpoint(progress: number, checkpoint: number): boolean {
  const target = CHECKPOINTS[checkpoint];
  return target !== undefined && progress > target + 34;
}

export function checkpointReached(progress: number, lane: number, checkpoint: number): boolean {
  const target = CHECKPOINTS[checkpoint];
  if (target === undefined) return false;
  const withinGate = progress >= target - 6 && progress <= target + 30;
  return withinGate && lateralError(target, lane) <= trailHalfWidth(target, lane) - 0.3;
}

export function progressRatio(progress: number): number {
  return Math.max(0, Math.min(1, progress / FINISH_PROGRESS));
}
