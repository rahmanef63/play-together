import { expect, it } from "vitest";
import type { TurboState } from "./model.js";
import { raceOrder } from "./raceOrder.js";

const track = {
  id: "neo-metro",
  name: "Test",
  width: 10,
  checkpoints: [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
    { x: 100, z: 100 },
  ],
} as TurboState["track"];
const racer = (id: string, x: number, extra = {}) => ({
  id,
  x,
  z: 0,
  lap: 0,
  nextCheckpoint: 1,
  finishMs: null as number | null,
  ...extra,
});
it("ranks an overtake between checkpoints without mutating snapshot order", () => {
  const racers = [racer("behind", 20), racer("ahead", 70)];
  expect(raceOrder(racers, track).map((r) => r.id)).toEqual(["ahead", "behind"]);
  expect(racers[0]?.id).toBe("behind");
});
it("prioritizes laps and recorded finishes over apparent track position", () => {
  const racers = [
    racer("ahead", 95),
    racer("lap", 0, { lap: 1 }),
    racer("winner", 0, { finishMs: 8000 }),
    racer("second", 0, { finishMs: 9000 }),
  ];
  expect(raceOrder(racers, track).map((r) => r.id)).toEqual(["winner", "second", "lap", "ahead"]);
});
it("handles degenerate segments deterministically", () => {
  const racers = [racer("b", 500), racer("a", 100)];
  expect(
    raceOrder(racers, {
      ...track,
      checkpoints: [
        { x: 0, z: 0 },
        { x: 0, z: 0 },
      ],
    }).map((r) => r.id),
  ).toEqual(["a", "b"]);
});
