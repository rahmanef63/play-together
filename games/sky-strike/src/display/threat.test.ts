import { expect, it } from "vitest";
import type { Plane, SkyState } from "./model.js";
import { incomingThreat } from "./threat.js";

it("warns only the targeted active pilot and clears when the missile disappears", () => {
  const me = { id: "p", x: 0, y: 0, z: 0, respawnMs: 0 } as Plane;
  const state = {
    phase: "dogfight",
    shots: [{ kind: "missile", targetId: "p", x: 3, y: 4, z: 0 }],
  } as SkyState;
  expect(incomingThreat(state, me)).toContain("5 m");
  expect(incomingThreat(state, { ...me, id: "other" })).toBe("");
  expect(incomingThreat({ ...state, shots: [] }, me)).toBe("");
  expect(incomingThreat(state, { ...me, respawnMs: 500 })).toBe("");
});
