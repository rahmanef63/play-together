export type Phase = "ready" | "play" | "victory" | "gameover";
export type EnemyKind = "runner" | "gunner" | "shield" | "boss";
export type ShotKind = "egg" | "sauce" | "enemy";
export type PickupKind = "egg" | "sauce";
export type Input = {
  move: number;
  aim: number;
  jump: boolean;
  fire: boolean;
  special: boolean;
  start: boolean;
};
export type Hero = {
  id: string;
  slot: number;
  x: number;
  y: number;
  vy: number;
  hp: number;
  sauce: number;
  combo: number;
  comboTimer: number;
  score: number;
  input: Input;
  fireCd: number;
  specialCd: number;
  invulnerableMs: number;
  wasJump: boolean;
  wasSpecial: boolean;
};
export type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  bob: number;
};
export type Shot = {
  id: number;
  owner?: string;
  x: number;
  y: number;
  vx: number;
  kind: ShotKind;
  damage: number;
};
export type Pickup = { id: number; kind: PickupKind; x: number; y: number };
export type TelurState = {
  kind: "ibu-ibu-telur-gulung";
  phase: Phase;
  wave: number;
  waveTimer: number;
  elapsedMs: number;
  heroes: Hero[];
  enemies: Enemy[];
  shots: Shot[];
  pickups: Pickup[];
  next: number;
  seed: number;
};
export const emptyInput = (): Input => ({
  move: 0,
  aim: 1,
  jump: false,
  fire: false,
  special: false,
  start: false,
});
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
