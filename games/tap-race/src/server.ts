import type { CreateServerGame, ServerGame, ServerPlayer } from "@play-together/game-sdk";

interface Racer {
  id: string;
  progress: number;
}

interface TapRaceState {
  kind: "tap-race";
  phase: "waiting" | "playing" | "finished";
  racers: Racer[];
  winnerId: string | null;
  round: number;
}

const MAX_PLAYERS = 4;
const TAP_PROGRESS = 4;
const RESET_DELAY_MS = 2_500;

class TapRaceGame implements ServerGame {
  readonly #state: TapRaceState = {
    kind: "tap-race",
    phase: "waiting",
    racers: [],
    winnerId: null,
    round: 1,
  };
  readonly #lastSequence = new Map<string, number>();
  #resetRemainingMs = 0;

  onJoin(player: ServerPlayer): void {
    if (this.#state.racers.some((racer) => racer.id === player.id)) return;
    if (this.#state.racers.length >= MAX_PLAYERS) return;
    this.#state.racers.push({ id: player.id, progress: 0 });
    if (this.#state.phase === "waiting") this.#state.phase = "playing";
  }

  onLeave(playerId: string): void {
    this.#state.racers = this.#state.racers.filter((racer) => racer.id !== playerId);
    this.#lastSequence.delete(playerId);
    if (!this.#state.racers.length) {
      this.#state.phase = "waiting";
      this.#state.winnerId = null;
      this.#resetRemainingMs = 0;
    } else if (this.#state.winnerId === playerId) {
      this.#resetRound();
    }
  }

  onInput(playerId: string, payload: unknown, sequence: number): void {
    if (this.#state.phase !== "playing") return;
    if (typeof payload !== "object" || payload === null) return;
    if ((payload as { action?: unknown }).action !== "tap") return;
    const previousSequence = this.#lastSequence.get(playerId) ?? -1;
    if (!Number.isInteger(sequence) || sequence <= previousSequence) return;
    this.#lastSequence.set(playerId, sequence);
    const racer = this.#state.racers.find((candidate) => candidate.id === playerId);
    if (!racer) return;
    racer.progress = Math.min(100, racer.progress + TAP_PROGRESS);
    if (racer.progress >= 100 && this.#state.winnerId === null) {
      this.#state.winnerId = playerId;
      this.#state.phase = "finished";
      this.#resetRemainingMs = RESET_DELAY_MS;
    }
  }

  tick(_nowMs: number, deltaMs: number): void {
    if (this.#state.phase !== "finished") return;
    this.#resetRemainingMs -= Math.max(0, Math.min(deltaMs, 250));
    if (this.#resetRemainingMs <= 0) this.#resetRound();
  }

  snapshot(): TapRaceState {
    return structuredClone(this.#state);
  }

  #resetRound(): void {
    for (const racer of this.#state.racers) racer.progress = 0;
    this.#state.winnerId = null;
    this.#state.phase = this.#state.racers.length ? "playing" : "waiting";
    this.#state.round += 1;
    this.#resetRemainingMs = 0;
    this.#lastSequence.clear();
  }
}

export const createServerGame: CreateServerGame = () => new TapRaceGame();
