import { describe, expect, it } from "vitest";
import { updateWorldItems, useHeldItem } from "./items.js";
import { deterministicItem } from "./pickups.js";
import { emptyInput, type Racer, type RaceState } from "./raceModel.js";

function racer(id: string, x = 0, z = 0): Racer {
  return {
    id,
    name: id,
    bot: false,
    carId: "falcon-r",
    ready: true,
    cameraMode: "chase",
    rearView: false,
    x,
    z,
    heading: 0,
    speed: 20,
    lap: 0,
    nextCheckpoint: 1,
    finished: false,
    finishMs: null,
    steering: 0,
    coins: 0,
    item: null,
    boostTimer: 0,
    driftTime: 0,
    driftTier: 0,
    drifting: false,
    draftTimer: 0,
    drafting: false,
    spinTimer: 0,
    rescueCooldown: 0,
    menuXActive: false,
    menuYActive: false,
    input: emptyInput(),
  };
}
function state(): RaceState {
  const a = racer("a"),
    b = racer("b", 0, 7);
  return {
    kind: "turbo-circuit",
    phase: "racing",
    countdownMs: 0,
    raceMs: 0,
    paused: false,
    lapsToWin: 3,
    trackId: "neo-metro",
    track: { id: "neo-metro", name: "Neo Metro Circuit", width: 18, checkpoints: [] },
    racers: [a, b],
    pickups: [],
    worldItems: [],
    winnerId: null,
  };
}
describe("kart items", () => {
  it("uses BOOST immediately", () => {
    const s = state(),
      a = required(s.racers[0]);
    a.item = "BOOST";
    useHeldItem(s, a, "forward");
    expect(a.item).toBeNull();
    expect(a.boostTimer).toBeGreaterThan(2);
    expect(s.worldItems).toHaveLength(0);
  });
  it("fires a PULSE that can spin another kart", () => {
    const s = state(),
      a = required(s.racers[0]),
      b = required(s.racers[1]);
    a.item = "PULSE";
    useHeldItem(s, a, "forward");
    expect(s.worldItems[0]?.type).toBe("pulse");
    for (let i = 0; i < 8; i++) updateWorldItems(s, 50);
    expect(b.spinTimer).toBeGreaterThan(0);
    expect(s.worldItems).toHaveLength(0);
  });
  it("selects only brand-neutral item types deterministically", () => {
    const values = Array.from({ length: 30 }, (_, i) => deterministicItem(i));
    expect(new Set(values)).toEqual(new Set(["BOOST", "PULSE", "MINE"]));
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test racer");
  return value;
}
