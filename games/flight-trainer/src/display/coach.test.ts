import { expect, it } from "vitest";
import { flightCoach } from "./coach.js";
import type { Aircraft, FlightState } from "./model.js";

it("prioritizes stall recovery and checks landing configuration", () => {
  const me = {
    x: 0,
    y: 10,
    z: -100,
    gearDown: true,
    airspeed: 30,
    roll: 0,
    pitch: 0,
    verticalSpeed: -2,
    nextCheckpoint: 0,
  } as Aircraft;
  const state = {
    checkpoints: [],
    runway: { x: 0, width: 22, zMin: -175, zMax: -45 },
  } as unknown as FlightState;
  expect(flightCoach(me, state)).toContain("GENTLE DESCENT");
  expect(flightCoach({ ...me, gearDown: false }, state)).toContain("LOWER GEAR");
  expect(flightCoach({ ...me, stall: true }, state)).toContain("STALL");
  expect(flightCoach({ ...me, crashed: true }, state)).toBe("");
});
