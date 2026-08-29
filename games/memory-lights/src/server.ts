import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

interface P {
  id: string;
  score: number;
  progress: number;
  mistakes: number;
}
interface State {
  kind: "memory-lights";
  phase: "show" | "input" | "result";
  round: number;
  sequence: number[];
  players: P[];
  winnerId: string | null;
  countdownMs: number;
}
function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
}
class MemoryGame implements ServerGame {
  readonly #r: () => number;
  readonly #last = new Map<string, number>();
  readonly #state: State = {
    kind: "memory-lights",
    phase: "show",
    round: 1,
    sequence: [],
    players: [],
    winnerId: null,
    countdownMs: 1800,
  };
  constructor(c: ServerGameContext) {
    this.#r = rng(c.seed);
    this.#newRound();
  }
  onJoin(p: ServerPlayer) {
    if (!this.#state.players.some((x) => x.id === p.id) && this.#state.players.length < 8)
      this.#state.players.push({ id: p.id, score: 0, progress: 0, mistakes: 0 });
  }
  onLeave(id: string) {
    this.#state.players = this.#state.players.filter((p) => p.id !== id);
    this.#last.delete(id);
  }
  onInput(id: string, payload: unknown, seq: number) {
    if (this.#state.phase !== "input" || typeof payload !== "object" || payload === null) return;
    const pad = (payload as { pad?: unknown }).pad;
    if (!Number.isInteger(pad) || Number(pad) < 0 || Number(pad) > 3) return;
    const prev = this.#last.get(id) ?? -1;
    if (seq <= prev) return;
    this.#last.set(id, seq);
    const p = this.#state.players.find((x) => x.id === id);
    if (!p) return;
    const expected = this.#state.sequence[p.progress];
    if (pad === expected) {
      p.progress++;
      if (p.progress >= this.#state.sequence.length) {
        p.score++;
        this.#state.winnerId = id;
        this.#state.phase = "result";
        this.#state.countdownMs = 1300;
      }
    } else {
      p.progress = 0;
      p.mistakes++;
    }
  }
  tick(_n: number, d: number) {
    this.#state.countdownMs -= Math.min(Math.max(d, 0), 250);
    if (this.#state.countdownMs > 0) return;
    if (this.#state.phase === "show") {
      this.#state.phase = "input";
      this.#state.countdownMs = 12000;
    } else if (this.#state.phase === "input") {
      this.#state.phase = "result";
      this.#state.winnerId = null;
      this.#state.countdownMs = 900;
    } else {
      this.#state.round++;
      this.#newRound();
    }
  }
  snapshot() {
    return structuredClone(this.#state);
  }
  #newRound() {
    const length = Math.min(3 + this.#state.round, 10);
    while (this.#state.sequence.length < length)
      this.#state.sequence.push(Math.floor(this.#r() * 4));
    for (const p of this.#state.players) p.progress = 0;
    this.#state.phase = "show";
    this.#state.winnerId = null;
    this.#state.countdownMs = 1000 + length * 420;
    this.#last.clear();
  }
}
export const createServerGame: CreateServerGame = (c) => new MemoryGame(c);
