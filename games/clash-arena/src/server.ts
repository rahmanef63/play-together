import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import { botInput } from "./server/bot.js";
import { advanceFighter, resolveRound } from "./server/combat.js";
import { bufferMove, parseInput } from "./server/input.js";
import { rematch, resetRound, select, syncBot } from "./server/lifecycle.js";
import { characterName, clamp, createFighter, createState } from "./server/model.js";

class ClashArena implements ServerGame {
  #s;
  #seq = new Map<string, number>();
  #frame = 0;

  constructor(context: ServerGameContext) {
    this.#s = createState(context.seed);
  }

  onJoin(player: ServerPlayer) {
    if (this.#s.fighters.some((fighter) => fighter.id === player.id)) return;
    if (this.#s.fighters.filter((fighter) => !fighter.bot).length >= 2) return;
    const side = this.#s.fighters.some((fighter) => fighter.side === 0) ? 1 : 0;
    const bot = this.#s.fighters.find((fighter) => fighter.bot && fighter.side === side);
    if (bot && this.#s.phase !== "select") {
      bot.id = player.id;
      bot.bot = false;
      bot.ready = true;
      bot.name = characterName(bot.character);
      return;
    }
    this.#s.fighters = this.#s.fighters.filter(
      (fighter) => !(fighter.bot && fighter.side === side),
    );
    this.#s.fighters.push(createFighter(player.id, side));
    syncBot(this.#s);
  }

  onLeave(id: string) {
    const fighter = this.#s.fighters.find((candidate) => candidate.id === id);
    if (fighter && !fighter.bot) {
      fighter.bot = true;
      fighter.ready = true;
      fighter.name = `${characterName(fighter.character)} · CPU`;
    }
    syncBot(this.#s);
  }

  onInput(id: string, payload: unknown, seq: number) {
    if (!Number.isInteger(seq) || seq < 0 || seq <= (this.#seq.get(id) ?? -1)) return;
    const fighter = this.#s.fighters.find((candidate) => candidate.id === id && !candidate.bot);
    if (!fighter) return;
    const previous = fighter.input;
    const input = parseInput(payload, previous);
    if (!input) return;
    this.#seq.set(id, seq);
    fighter.input = input;
    const pressed = (key: "a" | "b" | "start") => input[key] && !previous[key];
    if (this.#s.phase === "select") {
      const direction =
        Math.abs(input.x) > 0.55 && Math.abs(previous.x) <= 0.55 ? Math.sign(input.x) : 0;
      select(this.#s, id, direction, pressed("a") || pressed("start"), pressed("b"));
    } else if (this.#s.phase === "match-over" && pressed("start")) {
      rematch(this.#s);
    }
  }

  tick(_now: number, delta: number) {
    if (!Number.isFinite(delta)) return;
    const ms = clamp(delta, 0, 50);
    if (!ms) return;
    if (this.#s.phase === "intro") {
      this.#s.introMs -= ms;
      if (this.#s.introMs <= 0) {
        this.#s.phase = "fight";
        this.#s.event = "FIGHT";
        for (const fighter of this.#s.fighters) {
          fighter.previous = { ...fighter.input };
          fighter.buffer = null;
          fighter.bufferFrames = 0;
        }
      }
      return;
    }
    if (this.#s.phase === "round-over") {
      this.#s.resetMs -= ms;
      if (this.#s.resetMs <= 0) resetRound(this.#s);
      return;
    }
    if (this.#s.phase !== "fight") return;
    this.#frame += 1;
    this.#s.timerMs = Math.max(0, this.#s.timerMs - ms);
    const [left, right] = this.#s.fighters;
    if (!left || !right) return;
    for (const fighter of [left, right]) {
      if (fighter.bot) {
        botInput(fighter, fighter === left ? right : left, this.#s.seed, this.#frame);
      }
      bufferMove(fighter);
    }
    advanceFighter(this.#s, left, right);
    advanceFighter(this.#s, right, left);
    resolveRound(this.#s);
  }

  snapshot() {
    return structuredClone({
      ...this.#s,
      fighters: this.#s.fighters.map(({ input, previous, buffer, ...fighter }) => fighter),
    });
  }
}

export const createServerGame: CreateServerGame = (context) => new ClashArena(context);
