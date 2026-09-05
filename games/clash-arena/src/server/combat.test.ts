import { describe, expect, it } from "vitest";
import { advanceFighter, guard, resolveRound } from "./combat.js";
import { bufferMove } from "./input.js";
import { createFighter, createState } from "./model.js";

function pair() {
  const state = createState(7);
  const attacker = createFighter("nova", 0);
  const defender = createFighter("kite", 1);
  attacker.x = 0;
  defender.x = 0.6;
  state.fighters = [attacker, defender];
  state.phase = "fight";
  return { state, attacker, defender };
}
function strike(
  state: ReturnType<typeof pair>["state"],
  attacker: ReturnType<typeof createFighter>,
  defender: ReturnType<typeof createFighter>,
  move: NonNullable<ReturnType<typeof createFighter>["move"]>,
  frame: number,
) {
  Object.assign(attacker, { move, moveFrame: frame, hitDone: false, stun: 0, blockStun: 0 });
  advanceFighter(state, attacker, defender);
}

describe("Clash Arena combat", () => {
  it("guards high by holding away and low by crouching away", () => {
    const { attacker, defender } = pair();
    defender.input.x = 1;
    defender.input.y = 0;
    expect(guard(defender, attacker, true)).toBe(true);
    expect(guard(defender, attacker, false)).toBe(false);
    defender.input.y = -0.8;
    expect(guard(defender, attacker, false)).toBe(true);
    expect(guard(defender, attacker, true)).toBe(false);
  });

  it("lets AB escape throws and punishes the thrower", () => {
    const { state, attacker, defender } = pair();
    defender.input.a = defender.input.b = true;
    strike(state, attacker, defender, "throw", 4);
    expect(defender.hp).toBe(100);
    expect(attacker.stun).toBeGreaterThan(0);
    expect(state.event).toBe("THROW ESCAPE");
  });

  it("launches, scales juggle damage and limits follow-up hits", () => {
    const { state, attacker, defender } = pair();
    strike(state, attacker, defender, "launcher", 10);
    expect(defender.airborne).toBeGreaterThan(0);
    const afterLaunch = defender.hp;
    strike(state, attacker, defender, "jab", 4);
    const first = afterLaunch - defender.hp;
    strike(state, attacker, defender, "jab", 4);
    const second = afterLaunch - first - defender.hp;
    const limitedHp = defender.hp;
    strike(state, attacker, defender, "jab", 4);
    expect(first).toBeGreaterThan(second);
    expect(defender.juggle).toBe(2);
    expect(defender.hp).toBe(limitedHp);
  });

  it("hit-stun prevents movement until recovery", () => {
    const { state, attacker, defender } = pair();
    defender.stun = 3;
    defender.input.x = 1;
    const start = defender.x;
    advanceFighter(state, defender, attacker);
    expect(defender.x).toBe(start);
    advanceFighter(state, defender, attacker);
    advanceFighter(state, defender, attacker);
    advanceFighter(state, defender, attacker);
    expect(defender.x).toBeGreaterThan(start);
  });

  it("buffers a command during short recovery and spends meter only when Surge begins", () => {
    const { state, attacker, defender } = pair();
    attacker.stun = 3;
    attacker.meter = 30;
    attacker.input.yButton = true;
    bufferMove(attacker);
    expect(attacker.buffer).toBe("special");
    expect(attacker.meter).toBe(30);
    for (let i = 0; i < 4; i += 1) advanceFighter(state, attacker, defender);
    expect(attacker.move).toBe("special");
    expect(attacker.meter).toBe(5);
  });

  it("resolves timer draws and health advantages deterministically", () => {
    const { state, attacker, defender } = pair();
    state.timerMs = 0;
    resolveRound(state);
    expect(state.phase).toBe("round-over");
    expect(state.winnerId).toBeNull();
    state.phase = "fight";
    attacker.hp = 70;
    defender.hp = 40;
    resolveRound(state);
    expect(state.winnerId).toBe(attacker.id);
    expect(attacker.wins).toBe(1);
  });
});
