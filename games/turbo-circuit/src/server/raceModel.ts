export type Phase = "countdown" | "racing" | "finished";
export interface InputState {
  steer: number;
  throttle: number;
  brake: number;
  boost: boolean;
}
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
  steering: number;
  input: InputState;
}
export interface RaceState {
  kind: "turbo-circuit";
  phase: Phase;
  countdownMs: number;
  raceMs: number;
  lapsToWin: number;
  track: { rx: number; rz: number; width: number; checkpoints: Array<{ x: number; z: number }> };
  racers: Racer[];
  winnerId: string | null;
}
export const RX = 62;
export const RZ = 38;
export const WIDTH = 16;
export const LAPS = 3;
export const CPS = [
  { x: RX, z: 0 },
  { x: 0, z: RZ },
  { x: -RX, z: 0 },
  { x: 0, z: -RZ },
];
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function trackDeviation(x: number, z: number) {
  const q = Math.hypot(x / RX, z / RZ) || 1;
  return Math.hypot(x - x / q, z - z / q);
}
export function tangentHeading(angle: number) {
  return Math.atan2(-RX * Math.sin(angle), RZ * Math.cos(angle));
}

export function resolveCollisions(racers: Racer[]): void {
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i];
      const b = racers[j];
      if (!a || !b || dist(a, b) >= 3.2) continue;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const distance = Math.hypot(dx, dz) || 1;
      const push = (3.2 - distance) * 0.5;
      if (!a.bot) {
        a.x += (dx / distance) * push;
        a.z += (dz / distance) * push;
        a.speed *= 0.86;
      }
      if (!b.bot) {
        b.x -= (dx / distance) * push;
        b.z -= (dz / distance) * push;
        b.speed *= 0.86;
      }
    }
  }
}
