import { describe, expect, it } from "vitest";
import { DEFAULT_TRACK } from "../shared/catalog.js";
import { trackCheckpoints } from "../shared/trackMath.js";
import { createBot } from "./botDriver.js";
import { createPickups } from "./pickups.js";
import type { Racer, RaceState } from "./raceModel.js";
import { finishRaceIfComplete, requestRematch } from "./rematch.js";

function race(): { state: RaceState; humans: Racer[] } {
  const base = createBot(0, 7, DEFAULT_TRACK.id),
    human = (id: string): Racer => {
      const clone = structuredClone(base);
      delete clone.brain;
      return { ...clone, id, bot: false };
    },
    humans = [human("p1"), human("p2")],
    state: RaceState = {
      kind: "turbo-circuit",
      phase: "racing",
      countdownMs: 0,
      raceMs: 42000,
      paused: false,
      lapsToWin: 3,
      trackId: DEFAULT_TRACK.id,
      track: {
        id: DEFAULT_TRACK.id,
        name: DEFAULT_TRACK.name,
        width: DEFAULT_TRACK.width,
        checkpoints: trackCheckpoints(DEFAULT_TRACK),
      },
      racers: [...humans, base],
      pickups: createPickups(DEFAULT_TRACK.id),
      worldItems: [],
      winnerId: "p1",
    };
  return { state, humans };
}
describe("kart rematch flow", () => {
  it("requires every human to ready before starting a rematch", () => {
    const { state, humans } = race(),
      [p1, p2] = humans;
    if (!p1 || !p2) throw new Error("Human fixtures missing");
    p1.finished = p2.finished = true;
    expect(finishRaceIfComplete(state)).toBe(true);
    expect(state.phase).toBe("finished");
    expect(requestRematch(state, p1)).toBe(false);
    expect(requestRematch(state, p2)).toBe(true);
    expect(state.phase).toBe("countdown");
    expect(state.raceMs).toBe(0);
    expect(state.winnerId).toBeNull();
  });
});
