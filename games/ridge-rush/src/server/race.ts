import { createRider, type Rider, type RidgeState, resetRider } from "./model.js";

const TARGET_FIELD = 4;
const FINISH_GRACE_MS = 18_000;

export function syncBots(state: RidgeState): void {
  if (state.phase !== "lobby") return;
  const humans = state.riders.filter((rider) => !rider.bot);
  const occupied = new Set(humans.map((rider) => rider.slot));
  const bots: Rider[] = [];
  for (let slot = 0; slot < TARGET_FIELD && humans.length + bots.length < TARGET_FIELD; slot += 1) {
    if (!occupied.has(slot)) bots.push(createRider(`ridge-bot-${slot}`, slot, true));
  }
  state.riders = [...humans, ...bots].sort((a, b) => a.slot - b.slot);
}

export function nextHumanSlot(state: RidgeState): number | null {
  const occupied = new Set(state.riders.filter((rider) => !rider.bot).map((rider) => rider.slot));
  for (let slot = 0; slot < 4; slot += 1) if (!occupied.has(slot)) return slot;
  return null;
}

export function requestReady(state: RidgeState, rider: Rider): boolean {
  if (state.phase !== "lobby" && state.phase !== "finished") return false;
  rider.ready = true;
  const humans = state.riders.filter((item) => !item.bot);
  if (humans.length === 0 || !humans.every((item) => item.ready)) return false;
  if (state.phase === "finished") resetRace(state);
  state.phase = "countdown";
  state.countdownMs = 3000;
  return true;
}

export function resetRace(state: RidgeState): void {
  state.elapsedMs = 0;
  state.firstFinishAtMs = null;
  state.raceNumber += 1;
  state.riders = state.riders.map(resetRider);
}

export function finishRaceIfDone(state: RidgeState): boolean {
  const humans = state.riders.filter((rider) => !rider.bot);
  const allFinished = humans.length > 0 && humans.every((rider) => rider.finishedAt !== null);
  const graceExpired =
    state.firstFinishAtMs !== null && state.elapsedMs - state.firstFinishAtMs >= FINISH_GRACE_MS;
  if (!allFinished && !graceExpired) return false;
  state.phase = "finished";
  for (const human of humans) human.ready = false;
  for (const rider of state.riders) rider.speed = 0;
  return true;
}

export function snapshotRiders(state: RidgeState) {
  return state.riders
    .map(({ input: _input, jumpReady: _jumpReady, offTrailMs: _offTrailMs, ...rider }) => ({
      ...rider,
    }))
    .sort(compareRaceOrder);
}

export function compareRaceOrder(
  a: Pick<Rider, "finishedAt" | "progress" | "checkpoint" | "score">,
  b: Pick<Rider, "finishedAt" | "progress" | "checkpoint" | "score">,
): number {
  if (a.finishedAt !== null || b.finishedAt !== null) {
    if (a.finishedAt === null) return 1;
    if (b.finishedAt === null) return -1;
    return a.finishedAt - b.finishedAt;
  }
  return b.checkpoint - a.checkpoint || b.progress - a.progress || b.score - a.score;
}
