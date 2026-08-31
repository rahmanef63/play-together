export interface InputState {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  gun: boolean;
  missile: boolean;
}
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
  gunCd: number;
  missileCd: number;
  lockId: string | null;
  input: InputState;
}
export interface Shot {
  id: number;
  kind: "bullet" | "missile";
  ownerId: string;
  targetId: string | null;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
}
export interface State {
  kind: "sky-strike";
  phase: "dogfight" | "round-over";
  round: number;
  roundResetMs: number;
  winnerId: string | null;
  planes: Plane[];
  shots: Shot[];
}
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const d3 = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const forward = (p: { heading: number; pitch: number }) => ({
  x: Math.sin(p.heading) * Math.cos(p.pitch),
  y: Math.sin(p.pitch),
  z: Math.cos(p.heading) * Math.cos(p.pitch),
});

export function spawnPlane(id: string, name: string, bot: boolean, index: number, seed = 1): Plane {
  const a = (index * 2.17 + seed * 0.013) % (Math.PI * 2);
  return {
    id,
    name,
    bot,
    x: Math.cos(a) * 75,
    y: 34 + (index % 3) * 12,
    z: Math.sin(a) * 75,
    heading: wrapAngle(a + Math.PI),
    pitch: 0,
    roll: 0,
    speed: 38 + (index % 3) * 3,
    hp: 100,
    kills: 0,
    deaths: 0,
    respawnMs: 0,
    gunCd: 0,
    missileCd: 700 + index * 180,
    lockId: null,
    input: { pitch: 0, roll: 0, yaw: 0, throttle: 0.65, gun: false, missile: false },
  };
}

export function respawnPlane(plane: Plane): void {
  const a = (plane.deaths * 1.7 + plane.kills * 0.4) % (Math.PI * 2);
  plane.x = Math.cos(a) * 85;
  plane.z = Math.sin(a) * 85;
  plane.y = 42;
  plane.heading = wrapAngle(a + Math.PI);
  plane.pitch = 0;
  plane.roll = 0;
  plane.speed = 40;
  plane.hp = 100;
  plane.respawnMs = 0;
  plane.gunCd = 500;
  plane.missileCd = 1200;
}
