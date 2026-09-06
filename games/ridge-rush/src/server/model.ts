import { CHECKPOINTS, courseElevation, FINISH_PROGRESS } from "../shared/course.js";

export type Phase = "lobby" | "countdown" | "racing" | "finished";
export interface RiderInput {
  steer: number;
  body: number;
  pedal: boolean;
  brake: boolean;
  jump: boolean;
  attack: boolean;
}
export interface Rider {
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
  offTrailMs: number;
  jumpReady: boolean;
  sprintMs: number;
  sprinting: boolean;
  powerslide: boolean;
  frontBrake: boolean;
  currentTrick: string;
  pendingStyle: number;
  combo: number;
  hitFeedback: number;
  attackCooldown: number;
  pedalTappedAt: number;
  jumpWasDown: boolean;
  attackWasDown: boolean;
  input: RiderInput;
}
export interface RidgeState {
  kind: "ridge-rush";
  phase: Phase;
  countdownMs: number;
  elapsedMs: number;
  firstFinishAtMs: number | null;
  raceNumber: number;
  course: { length: number; checkpoints: readonly number[] };
  riders: Rider[];
}
export function emptyInput(): RiderInput {
  return { steer: 0, body: 0, pedal: false, brake: false, jump: false, attack: false };
}
export function createRider(id: string, slot: number, bot = false): Rider {
  const lanes = [-1.5, 1.5, -3, 3];
  return {
    id,
    name: bot ? `RIDGE BOT ${slot + 1}` : `RIDER ${slot + 1}`,
    bot,
    slot,
    progress: 0,
    lane: lanes[slot % lanes.length] ?? 0,
    speed: 0,
    lateralVelocity: 0,
    stamina: 100,
    checkpoint: 0,
    altitude: courseElevation(0) + 0.08,
    verticalSpeed: 0,
    grounded: true,
    airTimeMs: 0,
    pitch: 0,
    suspensionFront: 0,
    suspensionRear: 0,
    crashed: 0,
    finishedAt: null,
    score: 0,
    ready: bot,
    rearView: false,
    lean: 0,
    rescueCount: 0,
    offTrailMs: 0,
    jumpReady: true,
    sprintMs: 0,
    sprinting: false,
    powerslide: false,
    frontBrake: false,
    currentTrick: "",
    pendingStyle: 0,
    combo: 0,
    hitFeedback: 0,
    attackCooldown: 0,
    pedalTappedAt: -1000,
    jumpWasDown: false,
    attackWasDown: false,
    input: emptyInput(),
  };
}
export function createState(): RidgeState {
  return {
    kind: "ridge-rush",
    phase: "lobby",
    countdownMs: 3000,
    elapsedMs: 0,
    firstFinishAtMs: null,
    raceNumber: 1,
    course: { length: FINISH_PROGRESS, checkpoints: CHECKPOINTS },
    riders: [],
  };
}
export function resetRider(rider: Rider): Rider {
  return createRider(rider.id, rider.slot, rider.bot);
}
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
export function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
