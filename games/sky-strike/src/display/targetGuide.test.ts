import { expect, it } from "vitest";
import type { Plane, SkyState } from "./model.js";
import { targetGuide } from "./targetGuide.js";

const pilot = (id: string, x = 0, extra = {}) =>
  ({ id, x, y: 100, z: 0, hp: 100, heading: 0, respawnMs: 0, lockId: null, ...extra }) as Plane;
const me = pilot("me");
const state = {
  phase: "dogfight",
  planes: [me, pilot("near", -30), pilot("far", 100)],
} as SkyState;
it("finds nearest living opponent and keeps a valid lock", () => {
  expect(targetGuide(state, me)).toBe("TARGET 30 m · RIGHT → 90° · LEVEL");
  expect(targetGuide(state, { ...me, lockId: "far" })).toContain("LOCK 100 m · ← LEFT");
});
it("excludes dead, respawning and self targets and clears outside combat", () => {
  const empty = {
    ...state,
    planes: [me, pilot("dead", 0, { hp: 0 }), pilot("respawn", 0, { respawnMs: 100 })],
  };
  expect(targetGuide(empty, me)).toContain("SCANNING");
  expect(targetGuide(state, { ...me, respawnMs: 100 })).toBe("");
  expect(targetGuide({ ...state, phase: "round-over" }, me)).toBe("");
});
