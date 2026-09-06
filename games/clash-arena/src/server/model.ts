export type Button = "a" | "b" | "x" | "y";
export type CharacterId = "nova-rin" | "kite-vale";
export type Move = "jab" | "sweep" | "kick" | "launcher" | "throw" | "special" | null;

export const characters: readonly CharacterId[] = ["nova-rin", "kite-vale"];
export const characterName = (character: CharacterId) =>
  character === "nova-rin" ? "NOVA RIN" : "KITE VALE";

export interface Input {
  x: number;
  y: number;
  a: boolean;
  b: boolean;
  xButton: boolean;
  yButton: boolean;
  start: boolean;
}

export interface Fighter {
  id: string;
  name: string;
  character: CharacterId;
  ready: boolean;
  bot: boolean;
  side: number;
  hp: number;
  meter: number;
  wins: number;
  x: number;
  lane: number;
  input: Input;
  previous: Input;
  buffer: Move;
  bufferFrames: number;
  move: Move;
  moveFrame: number;
  hitDone: boolean;
  stun: number;
  blockStun: number;
  airborne: number;
  juggle: number;
  flash: string;
}

export interface State {
  kind: "clash-arena";
  phase: "select" | "intro" | "fight" | "round-over" | "match-over";
  round: number;
  timerMs: number;
  resetMs: number;
  introMs: number;
  winnerId: string | null;
  fighters: Fighter[];
  event: string;
  seed: number;
}

export const emptyInput = (): Input => ({
  x: 0,
  y: 0,
  a: false,
  b: false,
  xButton: false,
  yButton: false,
  start: false,
});
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function createFighter(
  id: string,
  side: number,
  bot = false,
  character: CharacterId = side ? "kite-vale" : "nova-rin",
): Fighter {
  return {
    id,
    name: `${characterName(character)}${bot ? " · CPU" : ""}`,
    character,
    ready: bot,
    bot,
    side,
    hp: 100,
    meter: 0,
    wins: 0,
    x: side ? -2.4 : 2.4,
    lane: 0,
    input: emptyInput(),
    previous: emptyInput(),
    buffer: null,
    bufferFrames: 0,
    move: null,
    moveFrame: 0,
    hitDone: false,
    stun: 0,
    blockStun: 0,
    airborne: 0,
    juggle: 0,
    flash: "",
  };
}

export function createState(seed: number): State {
  return {
    kind: "clash-arena",
    phase: "select",
    round: 1,
    timerMs: 60_000,
    resetMs: 0,
    introMs: 0,
    winnerId: null,
    fighters: [],
    event: "CHOOSE YOUR FIGHTER",
    seed,
  };
}

export const canAct = (fighter: Fighter) =>
  fighter.stun <= 0 && fighter.blockStun <= 0 && fighter.move === null;
