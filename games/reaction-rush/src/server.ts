import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

type Phase = "armed" | "go" | "result";
interface PlayerState {
  id: string;
  score: number;
  falseStarts: number;
}
interface ReactionState {
  kind: "reaction-rush";
  phase: Phase;
  round: number;
  countdownMs: number;
  winnerId: string | null;
  players: PlayerState[];
}

function randomFromSeed(seed: number) {
  let x = seed >>> 0 || 0x12345678;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

class ReactionRushGame implements ServerGame {
  readonly #random: () => number;
  readonly #state: ReactionState = {
    kind: "reaction-rush",
    phase: "armed",
    round: 1,
    countdownMs: 1800,
    winnerId: null,
    players: [],
  };
  readonly #lastSeq = new Map<string, number>();
  constructor(ctx: ServerGameContext) {
    this.#random = randomFromSeed(ctx.seed);
    this.#arm();
  }
  onJoin(player: ServerPlayer) {
    if (!this.#state.players.some((p) => p.id === player.id) && this.#state.players.length < 8)
      this.#state.players.push({ id: player.id, score: 0, falseStarts: 0 });
  }
  onLeave(playerId: string) {
    this.#state.players = this.#state.players.filter((p) => p.id !== playerId);
    this.#lastSeq.delete(playerId);
    if (this.#state.winnerId === playerId) this.#state.winnerId = null;
  }
  onInput(playerId: string, payload: unknown, sequence: number) {
    if (
      !this.#state.players.some((p) => p.id === playerId) ||
      typeof payload !== "object" ||
      payload === null ||
      (payload as { action?: unknown }).action !== "hit"
    )
      return;
    const prev = this.#lastSeq.get(playerId) ?? -1;
    if (sequence <= prev) return;
    this.#lastSeq.set(playerId, sequence);
    const player = this.#state.players.find((p) => p.id === playerId);
    if (!player) return;
    if (this.#state.phase === "armed") {
      player.score = Math.max(0, player.score - 1);
      player.falseStarts += 1;
      this.#state.winnerId = playerId;
      this.#state.phase = "result";
      this.#state.countdownMs = 1200;
      return;
    }
    if (this.#state.phase === "go") {
      player.score += 1;
      this.#state.winnerId = playerId;
      this.#state.phase = "result";
      this.#state.countdownMs = 1500;
    }
  }
  tick(_now: number, deltaMs: number) {
    this.#state.countdownMs -= Math.min(Math.max(deltaMs, 0), 250);
    if (this.#state.countdownMs > 0) return;
    if (this.#state.phase === "armed") {
      this.#state.phase = "go";
      this.#state.countdownMs = 1700;
    } else if (this.#state.phase === "go") {
      this.#state.winnerId = null;
      this.#state.phase = "result";
      this.#state.countdownMs = 900;
    } else {
      this.#state.round += 1;
      this.#state.winnerId = null;
      this.#arm();
    }
  }
  snapshot() {
    return structuredClone(this.#state);
  }
  #arm() {
    this.#state.phase = "armed";
    this.#state.countdownMs = 1300 + Math.floor(this.#random() * 2400);
  }
}
export const createServerGame: CreateServerGame = (ctx) => new ReactionRushGame(ctx);
