import { canAct, clamp, type Fighter, type Move, type State } from "./model.js";

const data: Record<
  Exclude<Move, null>,
  {
    start: number;
    end: number;
    range: number;
    damage: number;
    stun: number;
    high: boolean;
    launch?: boolean;
  }
> = {
  jab: { start: 5, end: 16, range: 1.2, damage: 7, stun: 13, high: true },
  kick: { start: 7, end: 21, range: 1.45, damage: 10, stun: 16, high: true },
  sweep: { start: 8, end: 23, range: 1.3, damage: 9, stun: 18, high: false },
  launcher: { start: 11, end: 28, range: 1.35, damage: 12, stun: 22, high: true, launch: true },
  throw: { start: 5, end: 17, range: 0.85, damage: 15, stun: 25, high: true },
  special: { start: 9, end: 30, range: 1.7, damage: 16, stun: 24, high: true },
};
export function guard(def: Fighter, att: Fighter, high: boolean): boolean {
  const away = Math.sign(def.x - att.x);
  return def.input.x * away > 0.35 && (high ? def.input.y > -0.45 : def.input.y < -0.35);
}
function hurt(s: State, a: Fighter, d: Fighter, m: Exclude<Move, null>): void {
  const v = data[m],
    distance = Math.abs(a.x - d.x);
  if (distance > v.range || Math.abs(a.lane - d.lane) > 0.8) return;
  if (m === "throw" && d.input.a && d.input.b) {
    a.stun = 18;
    a.flash = "THROW BROKEN";
    d.flash = "ESCAPE";
    s.event = "THROW ESCAPE";
    return;
  }
  const blocked = m !== "throw" && guard(d, a, v.high);
  if (blocked) {
    d.blockStun = 10;
    d.meter = clamp(d.meter + 4, 0, 100);
    d.flash = "BLOCK";
    s.event = "GUARD";
    return;
  }
  let damage = v.damage;
  if (d.airborne > 0) {
    if (d.juggle >= 2) {
      d.flash = "JUGGLE LIMIT";
      return;
    }
    damage = Math.ceil(damage * (d.juggle ? 0.55 : 0.75));
    d.juggle++;
  }
  d.hp = clamp(d.hp - damage, 0, 100);
  d.stun = v.stun;
  d.meter = clamp(d.meter + 6, 0, 100);
  a.meter = clamp(a.meter + 8, 0, 100);
  if (v.launch && d.airborne === 0) {
    d.airborne = 38;
    d.juggle = 0;
  }
  d.flash = `${damage} HIT`;
  s.event = d.flash;
}
export function advanceFighter(s: State, f: Fighter, foe: Fighter): void {
  f.stun = Math.max(0, f.stun - 1);
  f.blockStun = Math.max(0, f.blockStun - 1);
  f.airborne = Math.max(0, f.airborne - 1);
  if (f.airborne === 0) f.juggle = 0;
  f.lane = clamp(f.lane + f.input.y * 0.075, -1, 1);
  if (canAct(f)) f.x = clamp(f.x + f.input.x * 0.09, -5, 5);
  if (f.bufferFrames > 0) f.bufferFrames--;
  if (canAct(f) && f.buffer) {
    f.move = f.buffer;
    f.moveFrame = 0;
    f.hitDone = false;
    f.buffer = null;
    if (f.move === "special") f.meter -= 25;
  } else if (f.bufferFrames <= 0) f.buffer = null;
  if (!f.move) return;
  f.moveFrame++;
  const v = data[f.move];
  if (!f.hitDone && f.moveFrame >= v.start) {
    f.hitDone = true;
    hurt(s, f, foe, f.move);
  }
  if (f.moveFrame >= v.end) f.move = null;
}
export function resolveRound(s: State): void {
  const [a, b] = s.fighters;
  if (!a || !b) return;
  if (a.hp > 0 && b.hp > 0 && s.timerMs > 0) return;
  const winner = a.hp === b.hp ? null : a.hp > b.hp ? a : b;
  s.phase = "round-over";
  s.resetMs = 1800;
  s.winnerId = winner?.id ?? null;
  s.event = winner ? `${winner.name} TAKES ROUND` : `DRAW`;
  if (winner) winner.wins++;
}
