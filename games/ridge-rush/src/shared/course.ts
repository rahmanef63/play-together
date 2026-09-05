export const COURSE_LENGTH = 1180;
export const CHECKPOINTS = [175, 375, 590, 820, 1040] as const;
export const FINISH_PROGRESS = 1160;
export const MAIN_HALF_WIDTH = 5.4;
export const SHORTCUT_START = 575;
export const SHORTCUT_END = 770;
export const SHORTCUT_CENTER = 4.1;
export const SHORTCUT_HALF_WIDTH = 1.8;
export const BIKE_GROUND_OFFSET = 0.08;
export const JUMP_ZONES = [
  { start: 286, end: 308, impulse: 4.8 },
  { start: 706, end: 730, impulse: 5.6 },
  { start: 968, end: 988, impulse: 4.4 },
] as const;
export const DROP_LIPS = [
  { start: 248, end: 262 },
  { start: 518, end: 532 },
  { start: 792, end: 806 },
  { start: 1006, end: 1018 },
] as const;

export function clampProgress(value: number): number {
  return Math.max(0, Math.min(COURSE_LENGTH, value));
}

export function centerLine(progress: number): number {
  const p = clampProgress(progress);
  return Math.sin(p * 0.0115) * 4.6 + Math.sin(p * 0.0043 + 0.8) * 2.2 + Math.sin(p * 0.028) * 0.8;
}

export function courseElevation(progress: number): number {
  const p = clampProgress(progress);
  const baseline = 186 - p * 0.064;
  const majorDrops =
    24 * smoothStep(105, 255, p) + 35 * smoothStep(440, 645, p) + 41 * smoothStep(825, 1060, p);
  const rollers = Math.sin(p * 0.024) * 2.8 + Math.sin(p * 0.009 + 0.7) * 2.1;
  const ridgeClimb = bell(p, 342, 92, 10.5);
  const compression = -bell(p, 744, 70, 7.5);
  return baseline - majorDrops + rollers + ridgeClimb + compression;
}

export function courseSlope(progress: number): number {
  const p = clampProgress(progress);
  const before = courseElevation(Math.max(0, p - 0.8));
  const after = courseElevation(Math.min(COURSE_LENGTH, p + 0.8));
  return (after - before) / 1.6;
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
  if (inShortcut(progress, lane)) return 1.06;
  const edge = Math.abs(lane) / MAIN_HALF_WIDTH;
  return edge > 0.82 ? 0.9 : 1;
}

export function jumpAt(progress: number) {
  return JUMP_ZONES.find((zone) => progress >= zone.start && progress <= zone.end) ?? null;
}

export function isDropLip(progress: number): boolean {
  return DROP_LIPS.some((zone) => progress >= zone.start && progress <= zone.end);
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

function smoothStep(start: number, end: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function bell(value: number, center: number, halfWidth: number, height: number): number {
  const distance = Math.abs(value - center);
  if (distance >= halfWidth) return 0;
  const t = distance / halfWidth;
  return height * (0.5 + 0.5 * Math.cos(Math.PI * t));
}
