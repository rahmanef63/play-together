import type { CreateServerGame, ServerGame, ServerPlayer } from "@play-together/game-sdk";

interface P {
  id: string;
  score: number;
  combo: number;
  perfect: number;
  good: number;
  miss: number;
}
interface S {
  kind: "rhythm-pulse";
  beat: number;
  phase: number;
  bpm: number;
  players: P[];
}
class Rhythm implements ServerGame {
  readonly #s: S = { kind: "rhythm-pulse", beat: 0, phase: 0, bpm: 90, players: [] };
  readonly #seq = new Map<string, number>();
  #time = 0;
  onJoin(p: ServerPlayer) {
    if (!this.#s.players.some((x) => x.id === p.id) && this.#s.players.length < 8)
      this.#s.players.push({ id: p.id, score: 0, combo: 0, perfect: 0, good: 0, miss: 0 });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
    this.#seq.delete(id);
  }
  onInput(id: string, p: unknown, q: number) {
    if (typeof p !== "object" || p === null || (p as { action?: unknown }).action !== "tap") return;
    const last = this.#seq.get(id) ?? -1;
    if (q <= last) return;
    this.#seq.set(id, q);
    const x = this.#s.players.find((p) => p.id === id);
    if (!x) return;
    const dist = Math.min(this.#s.phase, 1 - this.#s.phase);
    if (dist < 0.07) {
      x.score += 100 + Math.min(x.combo, 20) * 2;
      x.combo++;
      x.perfect++;
    } else if (dist < 0.16) {
      x.score += 50;
      x.combo++;
      x.good++;
    } else {
      x.combo = 0;
      x.miss++;
    }
  }
  tick(_n: number, d: number) {
    const beatMs = 60000 / this.#s.bpm;
    this.#time += Math.max(0, Math.min(d, 100));
    const beat = Math.floor(this.#time / beatMs);
    this.#s.beat = beat;
    this.#s.phase = (this.#time % beatMs) / beatMs;
  }
  snapshot() {
    return structuredClone(this.#s);
  }
}
export const createServerGame: CreateServerGame = () => new Rhythm();
