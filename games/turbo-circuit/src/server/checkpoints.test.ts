import { expect, it } from "vitest";
import { createServerGame } from "../server.js";
import { DEFAULT_TRACK } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
import { advanceCheckpoint } from "./checkpoints.js";
import type { RaceState } from "./raceModel.js";

it("requires ordered checkpoints and the start line for every lap, including the winning lap", async () => {
  const game = await createServerGame({
    roomId: "test",
    gameId: "turbo-circuit",
    gameVersion: "0.12.0",
    seed: 1,
  });
  const state = game.snapshot() as RaceState;
  const racer = state.racers[0]!;
  const checkpoints = state.track.checkpoints;
  const start = sampleTrack(DEFAULT_TRACK)[0]!;
  const before = { x: start.x - Math.sin(start.heading), z: start.z - Math.cos(start.heading) };
  Object.assign(racer, checkpoints[0]);
  advanceCheckpoint(state, racer, before);
  expect(racer.lap).toBe(0);
  expect(racer.nextCheckpoint).toBe(1);
  for (let lap = 0; lap < state.lapsToWin; lap++) {
    for (let index = 1; index < checkpoints.length; index++) {
      Object.assign(racer, checkpoints[index]);
      advanceCheckpoint(state, racer, before);
    }
    expect(racer.lap).toBe(lap);
    expect(racer.finished).toBe(false);
    expect(racer.nextCheckpoint).toBe(0);
    Object.assign(racer, before);
    advanceCheckpoint(state, racer, before);
    expect(racer.lap).toBe(lap); // Merely being near the start is insufficient.
    Object.assign(racer, checkpoints[0]);
    advanceCheckpoint(state, racer, {
      x: start.x + Math.sin(start.heading),
      z: start.z + Math.cos(start.heading),
    });
    expect(racer.lap).toBe(lap); // Reverse crossing cannot finish a lap.
    state.raceMs += 10000;
    advanceCheckpoint(state, racer, before);
    expect(racer.lap).toBe(lap + 1);
    advanceCheckpoint(state, racer, before);
    expect(racer.lap).toBe(lap + 1);
  }
  expect(racer.finished).toBe(true);
  expect(racer.finishMs).toBe(state.raceMs);
  expect(state.winnerId).toBe(racer.id);
});
