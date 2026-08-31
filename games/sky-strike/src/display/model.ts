export interface Plane {
  id: string;
  name: string;
  bot: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  hp: number;
  kills: number;
  deaths: number;
  respawnMs: number;
  lockId: string | null;
}
export interface Shot {
  id: number;
  kind: "bullet" | "missile";
  ownerId: string;
  targetId: string | null;
  x: number;
  y: number;
  z: number;
}
export interface SkyState {
  kind: "sky-strike";
  phase: string;
  round: number;
  roundResetMs: number;
  winnerId: string | null;
  planes: Plane[];
  shots: Shot[];
}
export interface PlanePose {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
}
export const isSkyState = (value: unknown): value is SkyState =>
  typeof value === "object" && value !== null && (value as SkyState).kind === "sky-strike";
export const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
export const smoothAngle = (current: number, target: number, alpha: number) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
