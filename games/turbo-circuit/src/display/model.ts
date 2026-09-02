import type { CarId, TrackId } from "../shared/catalog.js";
export type CameraMode = "chase" | "wide" | "driver" | "bumper";
export type ItemType = "BOOST" | "PULSE" | "MINE";
export interface Racer {
  id: string;
  name: string;
  bot: boolean;
  carId: CarId;
  ready: boolean;
  cameraMode: CameraMode;
  rearView: boolean;
  steering: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  coins: number;
  item: ItemType | null;
  boostTimer: number;
  driftTime: number;
  driftTier: 0 | 1 | 2;
  drifting: boolean;
  draftTimer: number;
  drafting: boolean;
  spinTimer: number;
  rescueCooldown: number;
  finished: boolean;
  finishMs: number | null;
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
}
export interface TurboState {
  kind: "turbo-circuit";
  phase: "setup" | "countdown" | "racing" | "finished";
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
export interface RacerPose {
  x: number;
  z: number;
  heading: number;
}
export const isTurboState = (value: unknown): value is TurboState =>
  typeof value === "object" && value !== null && (value as TurboState).kind === "turbo-circuit";
