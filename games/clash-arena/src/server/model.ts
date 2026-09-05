export type Button = "a" | "b" | "x" | "y";
export type Move = "jab" | "sweep" | "kick" | "launcher" | "throw" | "special" | null;
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
  phase: "lobby" | "fight" | "round-over" | "match-over";
  round: number;
  timerMs: number;
  resetMs: number;
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
export function createFighter(id: string, side: number, bot = false): Fighter {
  return {
    id,
    name: `${side === 0 ? "NOVA RIN" : "KITE VALE"}${bot ? " · CPU" : ""}`,
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
    phase: "lobby",
    round: 1,
    timerMs: 60000,
    resetMs: 0,
    winnerId: null,
    fighters: [],
    event: "READY",
    seed,
  };
}
export const canAct = (f: Fighter) => f.stun <= 0 && f.blockStun <= 0 && f.move === null;
