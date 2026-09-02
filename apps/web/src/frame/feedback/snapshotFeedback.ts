import type { SnapshotMessage } from "@play-together/contracts";
import type { FeedbackCue } from "./feedbackEngine";

const RESULT_PHASES = new Set(["finished", "result", "round-over", "mission-complete"]);
const DAMAGE_FIELDS = ["hits", "deaths", "crashes", "misses"] as const;

export class SnapshotFeedbackObserver {
  readonly #playerId: string;
  readonly #emit: (cue: FeedbackCue) => void;
  #previous: Record<string, unknown> | null = null;

  constructor(playerId: string, emit: (cue: FeedbackCue) => void) {
    this.#playerId = playerId;
    this.#emit = emit;
  }

  observe(snapshot: SnapshotMessage): void {
    const current = objectState(snapshot.state);
    if (!current) return;
    const previous = this.#previous;
    this.#previous = structuredClone(current);
    if (!previous) return;

    const phase = stringValue(current.phase);
    const previousPhase = stringValue(previous.phase);
    if (phase && phase !== previousPhase && RESULT_PHASES.has(phase)) this.#emit("finish");

    const winner = stringValue(current.winnerId);
    const previousWinner = stringValue(previous.winnerId);
    if (winner && winner !== previousWinner)
      this.#emit(winner === this.#playerId ? "success" : "finish");

    const winnerTeam = numberValue(current.winnerTeam);
    const previousWinnerTeam = numberValue(previous.winnerTeam);
    if (winnerTeam !== null && winnerTeam !== previousWinnerTeam) this.#emit("finish");

    const currentPlayer = findPlayer(current, this.#playerId);
    const previousPlayer = findPlayer(previous, this.#playerId);
    if (!currentPlayer || !previousPlayer) return;
    for (const field of DAMAGE_FIELDS) {
      const next = numberValue(currentPlayer[field]);
      const before = numberValue(previousPlayer[field]);
      if (next !== null && before !== null && next > before) {
        this.#emit(field === "misses" ? "warning" : "impact");
        break;
      }
    }
    const score = numberValue(currentPlayer.score);
    const previousScore = numberValue(previousPlayer.score);
    if (score !== null && previousScore !== null && score > previousScore) this.#emit("success");
  }
}

function objectState(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function findPlayer(
  state: Record<string, unknown>,
  playerId: string,
): Record<string, unknown> | null {
  for (const key of ["players", "racers", "aircraft", "planes"] as const) {
    const collection = state[key];
    if (!Array.isArray(collection)) continue;
    const match = collection.find((item) => objectState(item)?.id === playerId);
    const object = objectState(match);
    if (object) return object;
  }
  return null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
