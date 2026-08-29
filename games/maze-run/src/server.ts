import type { CreateServerGame, ServerGame, ServerPlayer } from "@play-together/game-sdk";

const MAP = [
  "###############",
  "#S............#",
  "#.###########.#",
  "#.............#",
  "#.###########.#",
  "#.............#",
  "#.###########.#",
  "#.............#",
  "#.###########.#",
  "#............G#",
  "###############",
] as const;
interface P {
  id: string;
  x: number;
  y: number;
  wins: number;
  steps: number;
}
interface S {
  kind: "maze-run";
  map: readonly string[];
  goal: { x: number; y: number };
  players: P[];
  round: number;
}
class Maze implements ServerGame {
  readonly #s: S = { kind: "maze-run", map: MAP, goal: { x: 13, y: 9 }, players: [], round: 1 };
  readonly #seq = new Map<string, number>();
  onJoin(p: ServerPlayer) {
    if (!this.#s.players.some((x) => x.id === p.id) && this.#s.players.length < 4)
      this.#s.players.push({ id: p.id, x: 1, y: 1, wins: 0, steps: 0 });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
    this.#seq.delete(id);
  }
  onInput(id: string, p: unknown, q: number) {
    if (typeof p !== "object" || p === null) return;
    const d = (p as { move?: unknown }).move;
    if (typeof d !== "object" || d === null) return;
    const dx = (d as { x?: unknown }).x,
      dy = (d as { y?: unknown }).y;
    if (typeof dx !== "number" || typeof dy !== "number" || Math.abs(dx) + Math.abs(dy) !== 1)
      return;
    const last = this.#seq.get(id) ?? -1;
    if (q <= last) return;
    this.#seq.set(id, q);
    const pl = this.#s.players.find((p) => p.id === id);
    if (!pl) return;
    const nx = pl.x + dx,
      ny = pl.y + dy;
    if (MAP[ny]?.[nx] === undefined || MAP[ny]?.[nx] === "#") return;
    pl.x = nx;
    pl.y = ny;
    pl.steps++;
    if (nx === this.#s.goal.x && ny === this.#s.goal.y) {
      pl.wins++;
      pl.x = 1;
      pl.y = 1;
      pl.steps = 0;
      this.#s.round++;
    }
  }
  tick() {}
  snapshot() {
    return structuredClone(this.#s);
  }
}
export const createServerGame: CreateServerGame = () => new Maze();
