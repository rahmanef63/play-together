import {
  cliffSide,
  crossSlope,
  profileElevation,
  surfaceAt,
  surfaceGrip,
  surfaceRolling,
} from "./profile.js";

export { cliffSide, crossSlope, surfaceAt, surfaceGrip, surfaceRolling } from "./profile.js";

export const COURSE_LENGTH = 3600;
export const CHECKPOINTS = [420, 900, 1420, 1970, 2520, 3060, 3410] as const;
export const FINISH_PROGRESS = 3550;
export const MAIN_HALF_WIDTH = 4.6;
export const SHORTCUT_START = 1530;
export const SHORTCUT_END = 1810;
export const SHORTCUT_CENTER = 5.3;
export const SHORTCUT_HALF_WIDTH = 1.55;
export const BIKE_GROUND_OFFSET = 0.08;
export const JUMP_ZONES = [
  { start: 735, end: 765, impulse: 5.4 },
  { start: 1450, end: 1485, impulse: 6.2 },
  { start: 2340, end: 2375, impulse: 5.8 },
  { start: 3070, end: 3105, impulse: 6.5 },
] as const;
export const DROP_LIPS = [
  { start: 1034, end: 1055 },
  { start: 1800, end: 1822 },
  { start: 2690, end: 2712 },
  { start: 3260, end: 3284 },
] as const;

export function clampProgress(value: number): number {
  return Math.max(0, Math.min(COURSE_LENGTH, value));
}

export function centerLine(progress: number): number {
  const p = clampProgress(progress);
  const broad = Math.sin(p * 0.0047) * 18 + Math.sin(p * 0.0118 + 0.7) * 5.5;
  const forestSwitchbacks = windowedWave(p, 1900, 2580, 27, 0.022);
  const cliffTurns = windowedWave(p, 860, 1370, 12, 0.018);
  return broad + forestSwitchbacks + cliffTurns;
}

export function courseElevation(progress: number): number {
  return profileElevation(clampProgress(progress));
}

export function courseSlope(progress: number): number {
  const p = clampProgress(progress);
  const distance = 1.5;
  return (courseElevation(p + distance) - courseElevation(p - distance)) / (distance * 2);
}
export function gradeDegrees(progress: number): number {
  return (Math.atan(-courseSlope(progress)) * 180) / Math.PI;
}

export function courseHeading(progress: number): number {
  const p = clampProgress(progress);
  const distance = 2;
  return Math.atan2(centerLine(p + distance) - centerLine(p - distance), distance * 2);
}

export function inShortcut(progress: number, lane: number): boolean {
  return (
    progress >= SHORTCUT_START &&
    progress <= SHORTCUT_END &&
    Math.abs(lane - SHORTCUT_CENTER) <= SHORTCUT_HALF_WIDTH
  );
}
export function trailHalfWidth(progress: number, lane: number): number {
  if (inShortcut(progress, lane)) return SHORTCUT_HALF_WIDTH;
  return cliffSide(progress) ? 3.2 : MAIN_HALF_WIDTH;
}
export function laneCenter(progress: number, lane: number): number {
  return inShortcut(progress, lane) ? SHORTCUT_CENTER : 0;
}
export function lateralError(progress: number, lane: number): number {
  return Math.abs(lane - laneCenter(progress, lane));
}
export function surfaceSpeedFactor(progress: number, lane: number): number {
  if (inShortcut(progress, lane)) return 1.045;
  const edge = Math.abs(lane) / trailHalfWidth(progress, lane);
  return edge > 0.82 ? 0.92 : 1;
}
export function jumpAt(progress: number) {
  return JUMP_ZONES.find((zone) => progress >= zone.start && progress <= zone.end) ?? null;
}
export function isDropLip(progress: number): boolean {
  return DROP_LIPS.some((zone) => progress >= zone.start && progress <= zone.end);
}
export function missedCheckpoint(progress: number, checkpoint: number): boolean {
  const target = CHECKPOINTS[checkpoint];
  return target !== undefined && progress > target + 90;
}
export function checkpointReached(progress: number, lane: number, checkpoint: number): boolean {
  const target = CHECKPOINTS[checkpoint];
  return (
    target !== undefined &&
    progress >= target - 9 &&
    progress <= target + 55 &&
    lateralError(target, lane) <= trailHalfWidth(target, lane) - 0.25
  );
}
export function progressRatio(progress: number): number {
  return Math.max(0, Math.min(1, progress / FINISH_PROGRESS));
}
export function courseSurface(progress: number) {
  return surfaceAt(progress);
}
export function courseGrip(progress: number) {
  return surfaceGrip(surfaceAt(progress));
}
export function courseRolling(progress: number) {
  return surfaceRolling(surfaceAt(progress));
}
export function courseCrossSlope(progress: number) {
  return crossSlope(progress);
}

function windowedWave(
  p: number,
  start: number,
  end: number,
  amplitude: number,
  frequency: number,
): number {
  if (p <= start || p >= end) return 0;
  const t = (p - start) / (end - start);
  const envelope = Math.sin(Math.PI * t) ** 2;
  return Math.sin((p - start) * frequency) * amplitude * envelope;
}
