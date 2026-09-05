import { describe, expect, it } from "vitest";
import { rematch, resetRound, syncBot } from "./lifecycle.js";
import { createFighter, createState } from "./model.js";

describe("Clash Arena match lifecycle", () => {
  it("fills a solo match with one deterministic CPU fighter and preserves the human slot", () => {
    const state = createState(11);
    state.fighters.push(createFighter("nova", 0));
    syncBot(state);
    expect(state.fighters).toHaveLength(2);
    expect(state.fighters[1]).toMatchObject({ side: 1, bot: true, name: "KITE VALE · CPU" });
  });

  it("preserves round wins and ends a best-of-three at two wins", () => {
    const state = createState(11);
    state.fighters = [createFighter("nova", 0), createFighter("kite", 1)];
    state.phase = "round-over";
    state.fighters[0]!.wins = 1;
    resetRound(state);
    expect(state.phase).toBe("fight");
    expect(state.round).toBe(2);
    expect(state.fighters[0]!.wins).toBe(1);
    state.phase = "round-over";
    state.fighters[0]!.wins = 2;
    resetRound(state);
    expect(state.phase).toBe("match-over");
  });

  it("rematch resets health, meter, rounds and wins", () => {
    const state = createState(11);
    state.fighters = [createFighter("nova", 0), createFighter("kite", 1)];
    state.fighters[0]!.wins = 2;
    state.fighters[0]!.hp = 12;
    state.fighters[0]!.meter = 75;
    state.phase = "match-over";
    rematch(state);
    expect(state).toMatchObject({ phase: "fight", round: 1, timerMs: 60000 });
    expect(state.fighters[0]).toMatchObject({ wins: 0, hp: 100, meter: 0 });
  });
});
