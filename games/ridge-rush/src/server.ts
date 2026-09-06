import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import { parseInput } from "./server/input.js";
import { registerAttackEdge, registerJumpEdge, registerPedalEdge } from "./server/mechanics.js";
import { clamp, createRider, createState, emptyInput, type RidgeState } from "./server/model.js";
import { advanceRider, updateBotInput } from "./server/physics.js";
import {
  finishRaceIfDone,
  nextHumanSlot,
  requestReady,
  snapshotRiders,
  syncBots,
} from "./server/race.js";

class RidgeRush implements ServerGame {
  readonly #state: RidgeState = createState();
  readonly #sequence = new Map<string, number>();
  readonly #seed: number;

  constructor(context: ServerGameContext) {
    this.#seed = context.seed;
  }

  onJoin(player: ServerPlayer) {
    const existing = this.#state.riders.find((rider) => rider.id === player.id);
    if (existing) {
      existing.bot = false;
      existing.name = `RIDER ${existing.slot + 1}`;
      existing.input = emptyInput();
      this.#sequence.delete(player.id);
      return;
    }
    if (this.#state.phase !== "lobby") return;
    const slot = nextHumanSlot(this.#state);
    if (slot === null) return;
    this.#state.riders = this.#state.riders.filter((rider) => !(rider.bot && rider.slot === slot));
    this.#state.riders.push(createRider(player.id, slot));
    syncBots(this.#state);
  }

  onLeave(playerId: string) {
    const rider = this.#state.riders.find((item) => item.id === playerId);
    if (!rider || rider.bot) return;
    this.#sequence.delete(playerId);
    if (this.#state.phase === "lobby") {
      this.#state.riders = this.#state.riders.filter((item) => item.id !== playerId);
      syncBots(this.#state);
      return;
    }
    rider.bot = true;
    rider.name = `RIDGE BOT ${rider.slot + 1}`;
    rider.ready = true;
    rider.input = emptyInput();
  }

  onInput(playerId: string, payload: unknown, sequence: number) {
    if (!Number.isInteger(sequence) || sequence < 0) return;
    const previous = this.#sequence.get(playerId) ?? -1;
    if (sequence <= previous) return;
    const rider = this.#state.riders.find((item) => item.id === playerId && !item.bot);
    if (!rider) return;
    const parsed = parseInput(payload, rider.input);
    if (!parsed) return;
    this.#sequence.set(playerId, sequence);
    if (this.#state.phase === "racing") {
      registerPedalEdge(rider, parsed.input.pedal, this.#state.elapsedMs);
      registerJumpEdge(rider, parsed.input);
      registerAttackEdge(rider, parsed.input, this.#state.riders);
    }
    rider.input = parsed.input;
    if (parsed.readyRequested) requestReady(this.#state, rider);
  }

  tick(_nowMs: number, deltaMs: number) {
    if (!Number.isFinite(deltaMs)) return;
    const ms = clamp(deltaMs, 0, 50);
    if (ms <= 0) return;
    if (this.#state.phase === "countdown") {
      this.#state.countdownMs = Math.max(0, this.#state.countdownMs - ms);
      if (this.#state.countdownMs === 0) this.#state.phase = "racing";
      return;
    }
    if (this.#state.phase !== "racing") return;
    this.#state.elapsedMs += ms;
    const dt = ms / 1000;
    for (const rider of this.#state.riders) {
      if (rider.bot) updateBotInput(rider, this.#seed);
      const result = advanceRider(rider, dt, this.#state.elapsedMs);
      if (result.finished && this.#state.firstFinishAtMs === null) {
        this.#state.firstFinishAtMs = this.#state.elapsedMs;
      }
    }
    finishRaceIfDone(this.#state);
  }

  snapshot() {
    return structuredClone({
      kind: this.#state.kind,
      phase: this.#state.phase,
      countdownMs: this.#state.countdownMs,
      elapsedMs: this.#state.elapsedMs,
      raceNumber: this.#state.raceNumber,
      course: this.#state.course,
      riders: snapshotRiders(this.#state),
    });
  }
}

export const createServerGame: CreateServerGame = (context) => new RidgeRush(context);
