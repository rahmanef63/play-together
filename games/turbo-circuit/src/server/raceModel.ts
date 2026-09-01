import type { CarId, CircuitId } from "../shared/catalog.js";

export type Phase = "setup" | "countdown" | "racing" | "finished";
export interface InputState {
  steer: number;
  menuY: number;
  drive: boolean;
  brake: number;
  boost: boolean;
  cockpit: boolean;
  rearView: boolean;
  pause: boolean;
}
export interface BotBrain {
  chaos: number;
  chaosTarget: number;
  chaosTimer: number;
  skill: number;
  laneBias: number;
  aggression: number;
}
export interface Racer {
  id: string;
  name: string;
  bot: boolean;
  carId: CarId;
  ready: boolean;
  autoDrive: boolean;
  cockpit: boolean;
  rearView: boolean;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  nitro: number;
  finished: boolean;
  finishMs: number | null;
  steering: number;
  menuXActive: boolean;
  menuYActive: boolean;
  input: InputState;
  brain?: BotBrain;
}
export interface RaceState {
  kind: "turbo-circuit";
  phase: Phase;
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

export const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

export function resolveCollisions(racers: Racer[]): void {
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i];
      const b = racers[j];
      if (!a || !b || dist(a, b) >= 3.1) continue;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const distance = Math.hypot(dx, dz) || 1;
      const push = (3.1 - distance) * 0.48;
      a.x += (dx / distance) * push;
      a.z += (dz / distance) * push;
      b.x -= (dx / distance) * push;
      b.z -= (dz / distance) * push;
      a.speed *= 0.9;
      b.speed *= 0.9;
    }
  }
}
