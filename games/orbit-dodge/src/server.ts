import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

interface M {
  id: number;
  angle: number;
  r: number;
  speed: number;
}
interface P {
  id: string;
  angle: number;
  rotate: number;
  score: number;
  hits: number;
  shield: number;
}
interface S {
  kind: "orbit-dodge";
  players: P[];
  meteors: M[];
  level: number;
}
const TAU = Math.PI * 2;
function diff(a: number, b: number) {
  const d = Math.abs(a - b) % TAU;
  return Math.min(d, TAU - d);
}
function rng(seed: number) {
  let x = seed >>> 0 || 17;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}
class Orbit implements ServerGame {
  readonly #s: S = { kind: "orbit-dodge", players: [], meteors: [], level: 1 };
  readonly #r: () => number;
  #spawn = 0;
  #id = 0;
  constructor(c: ServerGameContext) {
    this.#r = rng(c.seed);
  }
  onJoin(p: ServerPlayer) {
    if (!this.#s.players.some((x) => x.id === p.id) && this.#s.players.length < 4)
      this.#s.players.push({
        id: p.id,
        angle: (this.#s.players.length * TAU) / 4,
        rotate: 0,
        score: 0,
        hits: 0,
        shield: 0,
      });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
  }
  onInput(id: string, p: unknown) {
    if (typeof p !== "object" || p === null) return;
    const r = (p as { rotate?: unknown }).rotate;
    if (typeof r !== "number" || !Number.isFinite(r)) return;
    const x = this.#s.players.find((p) => p.id === id);
    if (x) x.rotate = Math.max(-1, Math.min(1, r));
  }
  tick(_n: number, d: number) {
    const ms = Math.max(0, Math.min(d, 50)),
      dt = ms / 1000;
    this.#spawn += ms;
    for (const p of this.#s.players) {
      p.angle = (p.angle + p.rotate * 2.5 * dt + TAU) % TAU;
      p.score += dt * 8;
      p.shield = Math.max(0, p.shield - ms);
    }
    for (const m of this.#s.meteors) m.r -= m.speed * dt;
    for (const p of this.#s.players) {
      if (p.shield > 0) continue;
      const hit = this.#s.meteors.find(
        (m) => m.r < 0.25 && m.r > 0.13 && diff(m.angle, p.angle) < 0.17,
      );
      if (hit) {
        p.hits++;
        p.score = Math.max(0, p.score - 25);
        p.shield = 900;
        hit.r = -1;
      }
    }
    this.#s.meteors = this.#s.meteors.filter((m) => m.r > 0);
    const best = Math.max(0, ...this.#s.players.map((p) => p.score));
    this.#s.level = 1 + Math.floor(best / 100);
    if (this.#spawn >= Math.max(340, 900 - this.#s.level * 45)) {
      this.#spawn = 0;
      this.#s.meteors.push({
        id: ++this.#id,
        angle: this.#r() * TAU,
        r: 1.05,
        speed: 0.19 + this.#s.level * 0.015 + this.#r() * 0.08,
      });
    }
  }
  snapshot() {
    return structuredClone(this.#s);
  }
}
export const createServerGame: CreateServerGame = (c) => new Orbit(c);
