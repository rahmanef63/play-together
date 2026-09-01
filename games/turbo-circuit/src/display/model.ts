import type { CarId, CircuitId } from "../shared/catalog.js";

export interface Racer {
  id: string;
  name: string;
  bot: boolean;
  carId: CarId;
  ready: boolean;
  autoDrive: boolean;
  cockpit: boolean;
  rearView: boolean;
  steering: number;
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
  phase: "setup" | "countdown" | "racing" | "finished";
  countdownMs: number;
  raceMs: number;
  paused: boolean;
  lapsToWin: number;
  circuitId: CircuitId;
  track: {
    id: CircuitId;
    name: string;
    width: number;
    checkpoints: Array<{ x: number; z: number }>;
  };
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
