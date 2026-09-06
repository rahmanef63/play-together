import { describe, expect, it } from "vitest";
import { rematch, resetRound, select, syncBot } from "./lifecycle.js";
import { createFighter, createState } from "./model.js";

describe("Clash Arena match lifecycle", () => {
  it("keeps solo play on visible character select until the human confirms", () => {
    const state = createState(11);
    state.fighters.push(createFighter("nova", 0));
    syncBot(state);
    expect(state.phase).toBe("select");
    expect(state.fighters).toHaveLength(2);
    expect(state.fighters[1]).toMatchObject({
      side: 1,
      bot: true,
      ready: true,
      name: "KITE VALE · CPU",
    });
    select(state, "nova", 1, false, false);
    expect(state.fighters[0]).toMatchObject({ character: "kite-vale", ready: false });
    select(state, "nova", 0, true, false);
    expect(state.phase).toBe("intro");
  });

  it("lets a ready human back out while another human is still selecting", () => {
    const state = createState(12);
    state.fighters = [createFighter("p1", 0), createFighter("p2", 1)];
    select(state, "p1", 0, true, false);
    expect(state.phase).toBe("select");
    expect(state.fighters[0]?.ready).toBe(true);
    select(state, "p1", 0, false, true);
    expect(state.fighters[0]?.ready).toBe(false);
    select(state, "p1", 0, true, false);
    select(state, "p2", 0, true, false);
    expect(state.phase).toBe("intro");
  });

  it("preserves round wins and ends a best-of-three at two wins", () => {
    const state = createState(11);
    state.fighters = [createFighter("nova", 0), createFighter("kite", 1)];
    state.phase = "round-over";
    state.fighters[0]!.wins = 1;
    resetRound(state);
    expect(state.phase).toBe("intro");
    expect(state.round).toBe(2);
    expect(state.fighters[0]!.wins).toBe(1);
    state.phase = "round-over";
    state.fighters[0]!.wins = 2;
    resetRound(state);
    expect(state.phase).toBe("match-over");
  });

  it("rematch resets health, meter and wins before a fresh intro", () => {
    const state = createState(11);
    state.fighters = [createFighter("nova", 0), createFighter("kite", 1)];
    state.fighters[0]!.wins = 2;
    state.fighters[0]!.hp = 12;
    state.fighters[0]!.meter = 75;
    state.phase = "match-over";
    rematch(state);
    expect(state).toMatchObject({ phase: "intro", round: 1, timerMs: 60_000 });
    expect(state.fighters[0]).toMatchObject({ wins: 0, hp: 100, meter: 0, ready: true });
  });
});
