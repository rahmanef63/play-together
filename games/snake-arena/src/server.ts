import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

type Pos = { x: number; y: number };
interface P {
  id: string;
  body: Pos[];
  dir: Pos;
  next: Pos;
  score: number;
  crashes: number;
}
interface S {
  kind: "snake-arena";
  width: number;
  height: number;
  food: Pos;
  players: P[];
  round: number;
}
function rng(seed: number) {
  let x = seed >>> 0 || 11;
  return () => {
    x = (x * 1103515245 + 12345) >>> 0;
    return x / 0xffffffff;
  };
}
const W = 18,
  H = 14;
class Snake implements ServerGame {
  readonly #s: S = {
    kind: "snake-arena",
    width: W,
    height: H,
    food: { x: 9, y: 7 },
    players: [],
    round: 1,
  };
  readonly #r: () => number;
  #acc = 0;
  constructor(c: ServerGameContext) {
    this.#r = rng(c.seed);
    this.#food();
  }
  onJoin(p: ServerPlayer) {
    if (this.#s.players.some((x) => x.id === p.id) || this.#s.players.length >= 4) return;
    this.#s.players.push(this.#spawn(p.id, this.#s.players.length));
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
  }
  onInput(id: string, p: unknown) {
    if (typeof p !== "object" || p === null) return;
    const d = (p as { dir?: unknown }).dir;
    if (typeof d !== "object" || d === null) return;
    const x = (d as { x?: unknown }).x,
      y = (d as { y?: unknown }).y;
    if (typeof x !== "number" || typeof y !== "number" || Math.abs(x) + Math.abs(y) !== 1) return;
    const s = this.#s.players.find((p) => p.id === id);
    if (!s || (x === -s.dir.x && y === -s.dir.y)) return;
    s.next = { x, y };
  }
  tick(_n: number, d: number) {
    this.#acc += Math.max(0, Math.min(d, 100));
    while (this.#acc >= 150) {
      this.#acc -= 150;
      this.#step();
    }
  }
  snapshot() {
    return structuredClone(this.#s);
  }
  #step() {
    for (const p of this.#s.players) {
      p.dir = p.next;
      const h = p.body[0];
      if (!h) continue;
      const n = { x: h.x + p.dir.x, y: h.y + p.dir.y };
      const occupied = this.#s.players.some((o) =>
        o.body.some((b, i) => !(o === p && i === o.body.length - 1) && b.x === n.x && b.y === n.y),
      );
      if (n.x < 0 || n.x >= W || n.y < 0 || n.y >= H || occupied) {
        const idx = this.#s.players.indexOf(p);
        const fresh = this.#spawn(p.id, idx);
        p.body = fresh.body;
        p.dir = fresh.dir;
        p.next = fresh.next;
        p.crashes++;
        p.score = Math.max(0, p.score - 1);
        continue;
      }
      p.body.unshift(n);
      if (n.x === this.#s.food.x && n.y === this.#s.food.y) {
        p.score++;
        this.#food();
        if (p.score > 0 && p.score % 5 === 0) this.#s.round++;
      } else p.body.pop();
    }
  }
  #spawn(id: string, i: number): P {
    const spots = [
        { x: 2, y: 2 },
        { x: W - 3, y: H - 3 },
        { x: 2, y: H - 3 },
        { x: W - 3, y: 2 },
      ],
      dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];
    const h = spots[i % 4] ?? spots[0] ?? { x: 2, y: 2 },
      d = dirs[i % 4] ?? dirs[0] ?? { x: 1, y: 0 };
    return {
      id,
      body: [h, { x: h.x - d.x, y: h.y - d.y }, { x: h.x - d.x * 2, y: h.y - d.y * 2 }],
      dir: { ...d },
      next: { ...d },
      score: 0,
      crashes: 0,
    };
  }
  #food() {
    for (let tries = 0; tries < 80; tries++) {
      const p = { x: Math.floor(this.#r() * W), y: Math.floor(this.#r() * H) };
      if (!this.#s.players.some((s) => s.body.some((b) => b.x === p.x && b.y === p.y))) {
        this.#s.food = p;
        return;
      }
    }
    this.#s.food = { x: 9, y: 7 };
  }
}
export const createServerGame: CreateServerGame = (c) => new Snake(c);
