import { expect, it } from "vitest";
import type { RiderView, RidgeViewState } from "./model.js";
import { ridingCoach } from "./ridingCoach.js";

const me = {
  progress: 500,
  lane: 0,
  speed: 20,
  stamina: 80,
  grounded: true,
  finishedAt: null,
  crashed: 0,
} as RiderView;
const state = { phase: "racing" } as RidgeViewState;
it("warns before a drop and before leaving either trail edge", () => {
  expect(ridingCoach(state, { ...me, progress: 1020 })).toContain("DROP IN 14 m");
  expect(ridingCoach(state, { ...me, lane: 5 })).toContain("STEER RIGHT");
  expect(ridingCoach(state, { ...me, lane: -5 })).toContain("STEER LEFT");
});
it("prioritizes recovery and landings over sprint advice", () => {
  expect(ridingCoach(state, { ...me, crashed: 300 })).toContain("RECOVERING");
  expect(ridingCoach(state, { ...me, grounded: false, pendingStyle: 100 })).toContain("BANK STYLE");
  expect(ridingCoach(state, { ...me, stamina: 10 })).toContain("RELEASE A");
  expect(ridingCoach({ ...state, phase: "finished" }, me)).toBe("");
});
