import { expect, it } from "vitest";
import type { ViewFighter } from "./model.js";
import { spacingCoach } from "./spacingCoach.js";

const me = {
  x: 0,
  lane: 0,
  hp: 100,
  meter: 0,
  stun: 0,
  blockStun: 0,
  airborne: 0,
  move: null,
} as ViewFighter;
const foe = { ...me, x: 1 };
it("reflects shared strike ranges, lane and meter requirements", () => {
  expect(spacingCoach(me, foe)).toContain("JAB RANGE");
  expect(spacingCoach(me, { ...foe, x: 0.5 })).toContain("A+B THROW");
  expect(spacingCoach(me, { ...foe, x: 1.4 })).toContain("KICK RANGE");
  expect(spacingCoach(me, { ...foe, x: 1.6 })).toContain("MOVE CLOSER");
  expect(spacingCoach({ ...me, meter: 25 }, { ...foe, x: 1.6 })).toContain("SURGE RANGE");
  expect(spacingCoach(me, { ...foe, lane: 1 })).toContain("ALIGN");
});
it("suppresses suggestions during stun and shows move recovery", () => {
  expect(spacingCoach({ ...me, stun: 5 }, foe)).toBe("");
  expect(spacingCoach({ ...me, move: "jab", moveFrame: 2 }, foe)).toBe("WIND-UP");
  expect(spacingCoach({ ...me, move: "jab", moveFrame: 10 }, foe)).toBe("RECOVERY 6f");
  expect(spacingCoach(me, { ...foe, hp: 0 })).toBe("");
});
