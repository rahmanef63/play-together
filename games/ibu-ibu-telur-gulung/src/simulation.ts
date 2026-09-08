import { resolveHits } from "./combat.js";
import {
  clamp,
  type Enemy,
  type EnemyKind,
  emptyInput,
  type Hero,
  type Input,
  type TelurState,
} from "./types.js";

const GROUND = 300;
const MAX_WAVES = 8;
const ENEMY_STATS: Record<EnemyKind, readonly [number, number]> = {
  runner: [2, 95],
  gunner: [4, 44],
  shield: [7, 30],
  boss: [48, 16],
};

export function createInitialState(seed: number): TelurState {
  return {
    kind: "ibu-ibu-telur-gulung",
    phase: "ready",
    wave: 0,
    waveTimer: 0,
    elapsedMs: 0,
    heroes: [],
    enemies: [],
    shots: [],
    pickups: [],
    next: 1,
    seed: seed >>> 0,
  };
}

export function joinHero(state: TelurState, id: string): void {
  if (state.heroes.length >= 2 || state.heroes.some((hero) => hero.id === id)) return;
  const slot = state.heroes.length;
  state.heroes.push({
    id,
    slot,
    x: 90 + slot * 42,
    y: GROUND,
    vy: 0,
    hp: 5,
    sauce: 3,
    combo: 0,
    comboTimer: 0,
    score: 0,
    input: emptyInput(),
    fireCd: 0,
    specialCd: 0,
    invulnerableMs: 0,
    wasJump: false,
    wasSpecial: false,
  });
}

export function parseInput(value: unknown, previous: Input): Input | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Input>;
  const axis = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? clamp(value, -1, 1) : fallback;
  return {
    move: axis(raw.move, previous.move),
    aim: axis(raw.aim, previous.aim),
    jump: !!raw.jump,
    fire: !!raw.fire,
    special: !!raw.special,
    start: !!raw.start,
  };
}

export function tickState(state: TelurState, deltaMs: number): void {
  const ms = clamp(deltaMs, 0, 50);
  if (!ms || state.phase !== "play") return;
  state.elapsedMs += ms;
  state.waveTimer -= ms;
  if (!state.enemies.length && state.waveTimer <= 0) startWave(state);
  const dt = ms / 1000;
  for (const hero of state.heroes) advanceHero(state, hero, ms, dt);
  for (const enemy of state.enemies) advanceEnemy(state, enemy, ms, dt);
  for (const shot of state.shots) {
    shot.x += shot.vx * dt;
    if (shot.kind === "enemy") shot.y += Math.sin((state.elapsedMs + shot.id * 97) / 130) * 12 * dt;
  }
  resolveHits(state, GROUND);
  state.shots = state.shots.filter((shot) => shot.x > -40 && shot.x < 960);
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0 && enemy.x > -50);
  state.pickups = state.pickups.filter((pickup) => pickup.x > -100);
  if (state.heroes.length && state.heroes.every((hero) => hero.hp <= 0)) state.phase = "gameover";
}

function spawnEnemy(state: TelurState, kind: EnemyKind, index: number): void {
  const [maxHp] = ENEMY_STATS[kind];
  state.enemies.push({
    id: state.next++,
    kind,
    x: 760 + index * 72,
    y: GROUND,
    hp: maxHp,
    maxHp,
    cooldown: 400 + ((state.seed + index * 137) % 500),
    bob: index,
  });
}

function startWave(state: TelurState): void {
  state.wave++;
  if (state.wave > MAX_WAVES) {
    state.phase = "victory";
    return;
  }
  state.waveTimer = 1200;
  if (state.wave === 4 || state.wave === MAX_WAVES) {
    spawnEnemy(state, "boss", 0);
    return;
  }
  const cycle: EnemyKind[] = ["runner", "gunner", "shield"];
  for (let index = 0; index < state.wave + 2; index++) {
    const kind = cycle[(state.wave + index + state.seed) % cycle.length] ?? "runner";
    spawnEnemy(state, kind, index);
  }
}

function advanceHero(state: TelurState, hero: Hero, ms: number, dt: number): void {
  hero.fireCd = Math.max(0, hero.fireCd - ms);
  hero.specialCd = Math.max(0, hero.specialCd - ms);
  hero.invulnerableMs = Math.max(0, hero.invulnerableMs - ms);
  hero.comboTimer = Math.max(0, hero.comboTimer - ms);
  if (!hero.comboTimer) hero.combo = 0;
  hero.x = clamp(hero.x + hero.input.move * 220 * dt, 25, 610);
  hero.vy += 900 * dt;
  hero.y += hero.vy * dt;
  if (hero.y >= GROUND) [hero.y, hero.vy] = [GROUND, 0];
  if (hero.input.jump && !hero.wasJump && hero.y === GROUND) hero.vy = -440;
  hero.wasJump = hero.input.jump;
  if (hero.input.fire && hero.fireCd === 0) {
    state.shots.push({
      id: state.next++,
      owner: hero.id,
      x: hero.x + 24,
      y: hero.y - 26,
      vx: 540,
      kind: "egg",
      damage: 1,
    });
    hero.fireCd = 170;
  }
  if (hero.input.special && !hero.wasSpecial && hero.sauce > 0 && hero.specialCd === 0) {
    state.shots.push({
      id: state.next++,
      owner: hero.id,
      x: hero.x + 22,
      y: hero.y - 25,
      vx: 390,
      kind: "sauce",
      damage: 3,
    });
    hero.sauce--;
    hero.specialCd = 650;
  }
  hero.wasSpecial = hero.input.special;
}

function advanceEnemy(state: TelurState, enemy: Enemy, ms: number, dt: number): void {
  const [, speed] = ENEMY_STATS[enemy.kind];
  enemy.x -= speed * dt;
  enemy.cooldown -= ms;
  if (enemy.kind === "runner" || enemy.cooldown > 0) return;
  state.shots.push({
    id: state.next++,
    x: enemy.x - 16,
    y: enemy.y - 26,
    vx: enemy.kind === "boss" ? -260 : -190,
    kind: "enemy",
    damage: enemy.kind === "boss" ? 2 : 1,
  });
  enemy.cooldown = enemy.kind === "boss" ? 560 : 1150;
}
