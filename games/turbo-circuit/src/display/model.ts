export interface Racer {
  id: string;
  name: string;
  bot: boolean;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  nitro: number;
  finished: boolean;
  finishMs: number | null;
}
export interface TurboState {
  kind: "turbo-circuit";
  phase: string;
  countdownMs: number;
  raceMs: number;
  lapsToWin: number;
  track: { rx: number; rz: number; width: number; checkpoints: Array<{ x: number; z: number }> };
  racers: Racer[];
  winnerId: string | null;
}
export interface RacerPose {
  x: number;
  z: number;
  heading: number;
}
export const isTurboState = (value: unknown): value is TurboState =>
  typeof value === "object" && value !== null && (value as TurboState).kind === "turbo-circuit";
