import { expect, it } from "vitest";
import type { Aircraft, FlightState } from "./model.js";
import { flightNavigation } from "./navigation.js";

const me = { x: 0, z: 0, heading: 0, nextCheckpoint: 0 } as Aircraft;
const state = {
  checkpoints: [{ x: 100, z: 0 }],
  runway: { x: 0, zMin: -175, zMax: -45 },
} as FlightState;
it("uses physical left for positive heading and shows gate progress", () => {
  expect(flightNavigation(me, state)).toBe("GATE 1/1 · ← LEFT 90°");
  expect(
    flightNavigation(me, { ...state, checkpoints: [{ x: -100, z: 0 }] } as FlightState),
  ).toContain("RIGHT → 90°");
});
it("wraps bearings across north and directs completed gates back to runway", () => {
  expect(
    flightNavigation({ ...me, heading: 2 * Math.PI - 0.01 }, {
      ...state,
      checkpoints: [{ x: 0, z: 100 }],
    } as FlightState),
  ).toContain("STRAIGHT");
  expect(flightNavigation({ ...me, nextCheckpoint: 1 }, state)).toContain("RETURN TO RUNWAY");
  expect(flightNavigation({ ...me, crashed: true }, state)).toContain("RESTART");
  expect(flightNavigation({ ...me, missionComplete: true }, state)).toContain("COMPLETE");
});
