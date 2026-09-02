import type { CarId, TrackId } from "../shared/catalog.js";
export type Phase = "setup" | "countdown" | "racing" | "finished";
export type CameraMode = "chase" | "wide" | "driver" | "bumper";
export type ItemType = "BOOST" | "PULSE" | "MINE";
export interface InputState {
  steer: number;
  menuY: number;
  throttle: number;
  brake: number;
  drift: boolean;
  rearView: boolean;
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
  cameraMode: CameraMode;
  rearView: boolean;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  finished: boolean;
  finishMs: number | null;
  steering: number;
  coins: number;
  item: ItemType | null;
  boostTimer: number;
  driftTime: number;
  driftTier: 0 | 1 | 2;
  drifting: boolean;
  draftTimer: number;
  drafting: boolean;
  spinTimer: number;
  invulnerableTimer: number;
  rescueCooldown: number;
  scraping: boolean;
  wrongWay: boolean;
  wrongWayTimer: number;
  menuXActive: boolean;
  menuYActive: boolean;
  input: InputState;
  brain?: BotBrain;
}
export interface Pickup {
  id: string;
  type: "coin" | "item";
  x: number;
  z: number;
  active: boolean;
  respawnMs: number;
}
export interface WorldItem {
  id: string;
  type: "pulse" | "mine";
  x: number;
  z: number;
  vx: number;
  vz: number;
  ownerId: string;
  ttlMs: number;
  armMs: number;
  bounces: number;
}
export interface RaceState {
  kind: "turbo-circuit";
  phase: Phase;
  countdownMs: number;
  raceMs: number;
  paused: boolean;
  lapsToWin: number;
  trackId: TrackId;
  track: { id: TrackId; name: string; width: number; checkpoints: Array<{ x: number; z: number }> };
  racers: Racer[];
  pickups: Pickup[];
  worldItems: WorldItem[];
  winnerId: string | null;
}
export const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function resolveRacerCollisions(racers: Racer[]) {
  for (let i = 0; i < racers.length; i++)
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i],
        b = racers[j];
      if (!a || !b || a.spinTimer > 0 || b.spinTimer > 0) continue;
      const distance = dist(a, b);
      if (distance >= 3.1) continue;
      const dx = a.x - b.x,
        dz = a.z - b.z,
        length = distance || 1,
        push = (3.1 - length) * 0.48;
      const aWeight = a.bot ? 1 : 1.05,
        bWeight = b.bot ? 1 : 1.05,
        total = aWeight + bWeight;
      a.x += (dx / length) * push * (bWeight / total) * 2;
      a.z += (dz / length) * push * (bWeight / total) * 2;
      b.x -= (dx / length) * push * (aWeight / total) * 2;
      b.z -= (dz / length) * push * (aWeight / total) * 2;
    }
}
export const emptyInput = (): InputState => ({
  steer: 0,
  menuY: 0,
  throttle: 0,
  brake: 0,
  drift: false,
  rearView: false,
});
