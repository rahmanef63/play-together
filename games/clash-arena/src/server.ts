import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import { botInput } from "./server/bot.js";
import { advanceFighter, resolveRound } from "./server/combat.js";
import { bufferMove, parseInput } from "./server/input.js";
import { rematch, resetRound, start, syncBot } from "./server/lifecycle.js";
import { clamp, createFighter, createState } from "./server/model.js";

class ClashArena implements ServerGame {
  #s;
  #seq = new Map<string, number>();
  #frame = 0;
  constructor(c: ServerGameContext) {
    this.#s = createState(c.seed);
  }
  onJoin(p: ServerPlayer) {
    if (this.#s.fighters.some((f) => f.id === p.id)) return;
    if (this.#s.fighters.filter((f) => !f.bot).length >= 2) return;
    const side = this.#s.fighters.some((f) => f.side === 0) ? 1 : 0;
    this.#s.fighters = this.#s.fighters.filter((f) => !(f.bot && f.side === side));
    this.#s.fighters.push(createFighter(p.id, side));
    syncBot(this.#s);
    start(this.#s);
  }
  onLeave(id: string) {
    const f = this.#s.fighters.find((x) => x.id === id);
    if (f && !f.bot) {
      f.bot = true;
      f.name = `${f.side === 0 ? "NOVA RIN" : "KITE VALE"} · CPU`;
    }
    syncBot(this.#s);
  }
  onInput(id: string, payload: unknown, seq: number) {
    if (!Number.isInteger(seq) || seq < 0 || seq <= (this.#seq.get(id) ?? -1)) return;
    const f = this.#s.fighters.find((x) => x.id === id && !x.bot);
    if (!f) return;
    const input = parseInput(payload, f.input);
    if (!input) return;
    this.#seq.set(id, seq);
    f.input = input;
    if (this.#s.phase === "match-over" && input.start) rematch(this.#s);
  }
  tick(_n: number, d: number) {
    if (!Number.isFinite(d)) return;
    const ms = clamp(d, 0, 50);
    if (!ms) return;
    if (this.#s.phase === "round-over") {
      this.#s.resetMs -= ms;
      if (this.#s.resetMs <= 0) resetRound(this.#s);
      return;
    }
    if (this.#s.phase !== "fight") return;
    this.#frame++;
    this.#s.timerMs = Math.max(0, this.#s.timerMs - ms);
    const [a, b] = this.#s.fighters;
    if (!a || !b) return;
    for (const f of [a, b]) if (f.bot) botInput(f, f === a ? b : a, this.#s.seed, this.#frame);
    for (const f of [a, b]) bufferMove(f);
    advanceFighter(this.#s, a, b);
    advanceFighter(this.#s, b, a);
    resolveRound(this.#s);
  }
  snapshot() {
    return structuredClone({
      ...this.#s,
      fighters: this.#s.fighters.map(({ input, previous, buffer, ...f }) => f),
    });
  }
}
export const createServerGame: CreateServerGame = (c) => new ClashArena(c);
