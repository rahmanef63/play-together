import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

interface H {
  id: number;
  x: number;
  y: number;
  w: number;
  speed: number;
}
interface P {
  id: string;
  x: number;
  move: number;
  score: number;
  hits: number;
  invuln: number;
}
interface S {
  kind: "dodge-dash";
  players: P[];
  hazards: H[];
  level: number;
}
function rng(seed: number) {
  let x = seed >>> 0 || 13;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
}
class Dodge implements ServerGame {
  readonly #s: S = { kind: "dodge-dash", players: [], hazards: [], level: 1 };
  readonly #r: () => number;
  #spawn = 0;
  #id = 0;
  constructor(c: ServerGameContext) {
    this.#r = rng(c.seed);
  }
  onJoin(p: ServerPlayer) {
    if (!this.#s.players.some((x) => x.id === p.id) && this.#s.players.length < 4)
      this.#s.players.push({ id: p.id, x: 0.5, move: 0, score: 0, hits: 0, invuln: 0 });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
  }
  onInput(id: string, p: unknown) {
    if (typeof p !== "object" || p === null) return;
    const m = (p as { move?: unknown }).move;
    if (typeof m !== "number" || !Number.isFinite(m)) return;
    const x = this.#s.players.find((p) => p.id === id);
    if (x) x.move = Math.max(-1, Math.min(1, m));
  }
  tick(_n: number, d: number) {
    const dt = Math.max(0, Math.min(d, 50)) / 1000;
    this.#spawn += d;
    for (const p of this.#s.players) {
      p.x = Math.max(0.06, Math.min(0.94, p.x + p.move * dt * 0.75));
      p.score += dt * 10;
      p.invuln = Math.max(0, p.invuln - d);
    }
    for (const h of this.#s.hazards) h.y += h.speed * dt;
    for (const p of this.#s.players) {
      if (p.invuln > 0) continue;
      const hit = this.#s.hazards.find(
        (h) => Math.abs(h.y - 0.84) < 0.07 && Math.abs(h.x - p.x) < h.w / 2 + 0.035,
      );
      if (hit) {
        p.hits++;
        p.score = Math.max(0, p.score - 20);
        p.invuln = 900;
        hit.y = 1.2;
      }
    }
    this.#s.hazards = this.#s.hazards.filter((h) => h.y < 1.15);
    if (this.#spawn >= Math.max(300, 780 - this.#s.level * 35)) {
      this.#spawn = 0;
      this.#s.hazards.push({
        id: ++this.#id,
        x: 0.08 + this.#r() * 0.84,
        y: -0.08,
        w: 0.09 + this.#r() * 0.09,
        speed: 0.28 + this.#s.level * 0.018 + this.#r() * 0.12,
      });
    }
    const top = Math.max(0, ...this.#s.players.map((p) => p.score));
    this.#s.level = 1 + Math.floor(top / 120);
  }
  snapshot() {
    return structuredClone(this.#s);
  }
}
export const createServerGame: CreateServerGame = (c) => new Dodge(c);
