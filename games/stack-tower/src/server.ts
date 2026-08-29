import type { CreateServerGame, ServerGame, ServerPlayer } from "@play-together/game-sdk";

interface P {
  id: string;
  height: number;
  width: number;
  baseX: number;
  cursor: number;
  dir: 1 | -1;
  wins: number;
  misses: number;
}
interface S {
  kind: "stack-tower";
  round: number;
  players: P[];
}
class Stack implements ServerGame {
  readonly #s: S = { kind: "stack-tower", round: 1, players: [] };
  readonly #seq = new Map<string, number>();
  onJoin(p: ServerPlayer) {
    if (!this.#s.players.some((x) => x.id === p.id) && this.#s.players.length < 4)
      this.#s.players.push({
        id: p.id,
        height: 0,
        width: 0.56,
        baseX: 0.5,
        cursor: 0.12,
        dir: 1,
        wins: 0,
        misses: 0,
      });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
    this.#seq.delete(id);
  }
  onInput(id: string, p: unknown, q: number) {
    if (typeof p !== "object" || p === null || (p as { action?: unknown }).action !== "drop")
      return;
    const last = this.#seq.get(id) ?? -1;
    if (q <= last) return;
    this.#seq.set(id, q);
    const x = this.#s.players.find((p) => p.id === id);
    if (!x) return;
    const half = x.width / 2;
    const left = Math.max(x.baseX - half, x.cursor - half),
      right = Math.min(x.baseX + half, x.cursor + half),
      overlap = right - left;
    if (overlap <= 0.035) {
      x.height = 0;
      x.width = 0.56;
      x.baseX = 0.5;
      x.cursor = 0.12;
      x.misses++;
      return;
    }
    x.width = Math.max(0.08, overlap);
    x.baseX = (left + right) / 2;
    x.height++;
    x.cursor = x.dir > 0 ? 0.08 : 0.92;
    if (x.height >= 10) {
      x.wins++;
      x.height = 0;
      x.width = 0.56;
      x.baseX = 0.5;
      x.cursor = 0.12;
      this.#s.round++;
    }
  }
  tick(_n: number, d: number) {
    const dt = Math.max(0, Math.min(d, 50)) / 1000;
    for (const p of this.#s.players) {
      p.cursor += p.dir * (0.48 + p.height * 0.025) * dt;
      if (p.cursor > 0.94) {
        p.cursor = 0.94;
        p.dir = -1;
      } else if (p.cursor < 0.06) {
        p.cursor = 0.06;
        p.dir = 1;
      }
    }
  }
  snapshot() {
    return structuredClone(this.#s);
  }
}
export const createServerGame: CreateServerGame = () => new Stack();
