import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

interface Target {
  id: number;
  x: number;
  y: number;
  r: number;
  ttl: number;
}
interface P {
  id: string;
  score: number;
  shots: number;
  hits: number;
}
interface S {
  kind: "target-blast";
  round: number;
  targets: Target[];
  players: P[];
}
function rng(seed: number) {
  let x = seed >>> 0 || 7;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}
class TargetBlast implements ServerGame {
  readonly #s: S = { kind: "target-blast", round: 1, targets: [], players: [] };
  readonly #r: () => number;
  readonly #seq = new Map<string, number>();
  #spawn = 0;
  #id = 0;
  constructor(c: ServerGameContext) {
    this.#r = rng(c.seed);
    for (let i = 0; i < 3; i++) this.#add();
  }
  onJoin(p: ServerPlayer) {
    if (!this.#s.players.some((x) => x.id === p.id) && this.#s.players.length < 8)
      this.#s.players.push({ id: p.id, score: 0, shots: 0, hits: 0 });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
    this.#seq.delete(id);
  }
  onInput(id: string, p: unknown, q: number) {
    if (typeof p !== "object" || p === null) return;
    const v = p as { x?: unknown; y?: unknown; action?: unknown };
    if (
      v.action !== "shoot" ||
      typeof v.x !== "number" ||
      typeof v.y !== "number" ||
      !Number.isFinite(v.x) ||
      !Number.isFinite(v.y)
    )
      return;
    const last = this.#seq.get(id) ?? -1;
    if (q <= last) return;
    this.#seq.set(id, q);
    const pl = this.#s.players.find((x) => x.id === id);
    if (!pl) return;
    pl.shots++;
    const x = Math.max(0, Math.min(1, v.x)),
      y = Math.max(0, Math.min(1, v.y));
    let hit = -1;
    for (let i = 0; i < this.#s.targets.length; i++) {
      const t = this.#s.targets[i];
      if (!t) continue;
      if (Math.hypot(t.x - x, t.y - y) <= t.r) {
        hit = i;
        break;
      }
    }
    if (hit >= 0) {
      pl.score += 10;
      pl.hits++;
      this.#s.targets.splice(hit, 1);
      this.#add();
    }
  }
  tick(_n: number, d: number) {
    const dt = Math.max(0, Math.min(d, 250));
    this.#spawn += dt;
    for (const t of this.#s.targets) t.ttl -= dt;
    this.#s.targets = this.#s.targets.filter((t) => t.ttl > 0);
    if (this.#spawn >= 900 || this.#s.targets.length < 3) {
      this.#spawn = 0;
      while (this.#s.targets.length < 5) this.#add();
    }
    if (this.#s.players.some((p) => p.score >= 100)) {
      this.#s.round++;
      for (const p of this.#s.players) {
        p.score = 0;
        p.shots = 0;
        p.hits = 0;
      }
    }
  }
  snapshot() {
    return structuredClone(this.#s);
  }
  #add() {
    this.#s.targets.push({
      id: ++this.#id,
      x: 0.12 + this.#r() * 0.76,
      y: 0.12 + this.#r() * 0.76,
      r: 0.055 + this.#r() * 0.035,
      ttl: 2200 + this.#r() * 2200,
    });
  }
}
export const createServerGame: CreateServerGame = (c) => new TargetBlast(c);
