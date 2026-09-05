export interface RiderView {
  id: string;
  name: string;
  bot: boolean;
  slot: number;
  progress: number;
  lane: number;
  speed: number;
  lateralVelocity: number;
  stamina: number;
  checkpoint: number;
  altitude: number;
  verticalSpeed: number;
  grounded: boolean;
  airTimeMs: number;
  pitch: number;
  suspensionFront: number;
  suspensionRear: number;
  crashed: number;
  finishedAt: number | null;
  score: number;
  ready: boolean;
  rearView: boolean;
  lean: number;
  rescueCount: number;
}
export interface RidgeViewState {
  kind: "ridge-rush";
  phase: "lobby" | "countdown" | "racing" | "finished";
  countdownMs: number;
  elapsedMs: number;
  raceNumber: number;
  course: { length: number; checkpoints: readonly number[] };
  riders: RiderView[];
}
export interface RiderPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  lean: number;
  pitch: number;
  suspensionFront: number;
  suspensionRear: number;
}
export function isRidgeState(value: unknown): value is RidgeViewState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<RidgeViewState>;
  return (
    state.kind === "ridge-rush" &&
    typeof state.phase === "string" &&
    typeof state.elapsedMs === "number" &&
    Array.isArray(state.riders) &&
    typeof state.course?.length === "number"
  );
}
export function smoothing(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}
export function smoothAngle(from: number, to: number, alpha: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * alpha;
}
