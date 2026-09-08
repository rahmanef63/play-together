import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import { createInitialState, joinHero, parseInput, tickState } from "./simulation.js";
import type { TelurState } from "./types.js";

class TelurGulung implements ServerGame {
  readonly #state: TelurState;
  readonly #sequences = new Map<string, number>();

  constructor(context: ServerGameContext) {
    this.#state = createInitialState(context.seed);
  }

  onJoin(player: ServerPlayer): void {
    joinHero(this.#state, player.id);
  }

  onLeave(playerId: string): void {
    this.#state.heroes = this.#state.heroes.filter((hero) => hero.id !== playerId);
    this.#sequences.delete(playerId);
  }

  onInput(playerId: string, payload: unknown, sequence: number): void {
    const previousSequence = this.#sequences.get(playerId) ?? -1;
    if (!Number.isInteger(sequence) || sequence < 0 || sequence <= previousSequence) return;
    const hero = this.#state.heroes.find((entry) => entry.id === playerId);
    if (!hero) return;
    const input = parseInput(payload, hero.input);
    if (!input) return;
    this.#sequences.set(playerId, sequence);
    hero.input = input;
    if (input.start && this.#state.phase === "ready") this.#state.phase = "play";
  }

  tick(_nowMs: number, deltaMs: number): void {
    if (Number.isFinite(deltaMs)) tickState(this.#state, deltaMs);
  }

  snapshot(): TelurState {
    return structuredClone(this.#state);
  }
}

export const createServerGame: CreateServerGame = (context) => new TelurGulung(context);
