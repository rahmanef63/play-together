import { describe, expect, it } from "vitest";
import { DEFAULT_TRACK } from "../shared/catalog.js";
import { trackCheckpoints } from "../shared/trackMath.js";
import { createBot, rubberBandBonus } from "./botDriver.js";
import { createPickups } from "./pickups.js";
import type { Racer, RaceState } from "./raceModel.js";

function state(bot: Racer, human: Racer): RaceState {
  return {
    kind: "turbo-circuit",
    phase: "racing",
    countdownMs: 0,
    raceMs: 0,
    paused: false,
    lapsToWin: DEFAULT_TRACK.laps,
    trackId: DEFAULT_TRACK.id,
    track: {
      id: DEFAULT_TRACK.id,
      name: DEFAULT_TRACK.name,
      width: DEFAULT_TRACK.width,
      checkpoints: trackCheckpoints(DEFAULT_TRACK),
    },
    racers: [bot, human],
    pickups: createPickups(DEFAULT_TRACK.id),
    worldItems: [],
    winnerId: null,
  };
}
function humanFrom(bot: Racer): Racer {
  const clone = structuredClone(bot);
  delete clone.brain;
  return { ...clone, id: "human", bot: false };
}
describe("CPU rubber banding", () => {
  it("helps a trailing CPU without unbounded speed injection", () => {
    const bot = createBot(0, 42, DEFAULT_TRACK.id),
      human = humanFrom(bot),
      race = state(bot, human);
    human.lap = 1;
    expect(rubberBandBonus(bot, race)).toBeGreaterThan(0);
    expect(rubberBandBonus(bot, race)).toBeLessThanOrEqual(12);
  });
  it("slightly trims a CPU that is far ahead", () => {
    const bot = createBot(0, 42, DEFAULT_TRACK.id),
      human = humanFrom(bot),
      race = state(bot, human);
    bot.lap = 1;
    expect(rubberBandBonus(bot, race)).toBeLessThan(0);
    expect(rubberBandBonus(bot, race)).toBeGreaterThanOrEqual(-6);
  });
});
