import { characterName, createFighter, type Fighter, type State } from "./model.js";

export function syncBot(state: State): void {
  const humans = state.fighters.filter((fighter) => !fighter.bot);
  if (humans.length !== 1 || state.fighters.some((fighter) => fighter.bot)) return;
  const side = humans[0]?.side === 0 ? 1 : 0;
  const character = state.seed % 2 === 0 ? "nova-rin" : "kite-vale";
  state.fighters.push(createFighter("orbit-bot", side, true, character));
}

export function beginIntro(state: State, label = `ROUND ${state.round}`): void {
  state.phase = "intro";
  state.introMs = 2_200;
  state.event = label;
  for (const fighter of state.fighters) {
    fighter.buffer = null;
    fighter.bufferFrames = 0;
    fighter.move = null;
  }
}

export function resetRound(state: State): void {
  if (state.fighters.some((fighter) => fighter.wins >= 2)) {
    state.phase = "match-over";
    state.event = "MATCH OVER";
    return;
  }
  state.round += 1;
  state.timerMs = 60_000;
  state.winnerId = null;
  for (const fighter of state.fighters) resetFighter(fighter, true);
  beginIntro(state);
}

export function rematch(state: State): void {
  state.round = 1;
  state.timerMs = 60_000;
  state.winnerId = null;
  for (const fighter of state.fighters) resetFighter(fighter, false);
  beginIntro(state, "REMATCH");
}

export function select(
  state: State,
  id: string,
  direction: number,
  confirm: boolean,
  back: boolean,
): void {
  const fighter = state.fighters.find((candidate) => candidate.id === id && !candidate.bot);
  if (!fighter) return;
  if (back) {
    fighter.ready = false;
    state.event = `${fighter.name} SELECTING`;
  }
  if (!fighter.ready && direction !== 0) {
    fighter.character = fighter.character === "nova-rin" ? "kite-vale" : "nova-rin";
    fighter.name = characterName(fighter.character);
    state.event = `${fighter.name} SELECTED`;
  }
  if (confirm) {
    fighter.ready = true;
    state.event = `${fighter.name} READY`;
  }
  if (state.fighters.length === 2 && state.fighters.every((candidate) => candidate.ready)) {
    beginIntro(state, "VERSUS");
  }
}

function resetFighter(fighter: Fighter, preserveWins: boolean): void {
  const wins = preserveWins ? fighter.wins : 0;
  const fresh = createFighter(fighter.id, fighter.side, fighter.bot, fighter.character);
  fresh.wins = wins;
  fresh.ready = true;
  Object.assign(fighter, fresh);
}
