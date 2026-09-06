export type CharacterId = "nova-rin" | "kite-vale";

export type ViewFighter = {
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
  move: string | null;
  stun: number;
  airborne: number;
  flash: string;
  moveFrame: number;
  blockStun: number;
};

export type ArenaState = {
  kind: "clash-arena";
  phase: "select" | "intro" | "fight" | "round-over" | "match-over";
  round: number;
  timerMs: number;
  introMs: number;
  winnerId: string | null;
  event: string;
  fighters: ViewFighter[];
};

export const isArenaState = (value: unknown): value is ArenaState =>
  !!value && typeof value === "object" && (value as { kind?: unknown }).kind === "clash-arena";
