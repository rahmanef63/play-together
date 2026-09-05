import { describe, expect, it } from "vitest";
import { createRider, createState } from "./model.js";
import {
  compareRaceOrder,
  finishRaceIfDone,
  requestReady,
  snapshotRiders,
  syncBots,
} from "./race.js";

describe("Ridge Rush race lifecycle", () => {
  it("fills empty grid slots with bots without reducing four-human capacity", () => {
    const state = createState();
    state.riders.push(createRider("p1", 0), createRider("p2", 2));
    syncBots(state);
    expect(state.riders).toHaveLength(4);
    expect(state.riders.filter((rider) => !rider.bot)).toHaveLength(2);
    expect(state.riders.map((rider) => rider.slot)).toEqual([0, 1, 2, 3]);
  });

  it("requires every connected human to ready before countdown", () => {
    const state = createState();
    const first = createRider("p1", 0);
    const second = createRider("p2", 1);
    state.riders.push(first, second);
    syncBots(state);
    expect(requestReady(state, first)).toBe(false);
    expect(state.phase).toBe("lobby");
    expect(requestReady(state, second)).toBe(true);
    expect(state.phase).toBe("countdown");
    expect(state.countdownMs).toBe(3000);
  });

  it("resets a finished race only after every human requests the rematch", () => {
    const state = createState();
    const first = createRider("p1", 0);
    const second = createRider("p2", 1);
    state.riders.push(first, second);
    syncBots(state);
    state.phase = "finished";
    state.elapsedMs = 60_000;
    first.progress = 800;
    second.progress = 700;
    const race = state.raceNumber;
    expect(requestReady(state, first)).toBe(false);
    expect(requestReady(state, second)).toBe(true);
    expect(state.phase).toBe("countdown");
    expect(state.raceNumber).toBe(race + 1);
    expect(state.elapsedMs).toBe(0);
    expect(state.riders.every((rider) => rider.progress === 0)).toBe(true);
  });

  it("ends when all humans finish, not when a bot or the first human finishes", () => {
    const state = createState();
    const first = createRider("p1", 0);
    const second = createRider("p2", 1);
    state.riders.push(first, second);
    syncBots(state);
    state.phase = "racing";
    first.finishedAt = 40_000;
    state.firstFinishAtMs = 40_000;
    state.elapsedMs = 45_000;
    expect(finishRaceIfDone(state)).toBe(false);
    second.finishedAt = 44_000;
    expect(finishRaceIfDone(state)).toBe(true);
    expect(state.phase).toBe("finished");
  });

  it("uses a bounded finish grace when a human cannot complete", () => {
    const state = createState();
    const first = createRider("p1", 0);
    const second = createRider("p2", 1);
    state.riders.push(first, second);
    syncBots(state);
    state.phase = "racing";
    first.finishedAt = 40_000;
    state.firstFinishAtMs = 40_000;
    state.elapsedMs = 57_999;
    expect(finishRaceIfDone(state)).toBe(false);
    state.elapsedMs = 58_000;
    expect(finishRaceIfDone(state)).toBe(true);
    expect(second.finishedAt).toBeNull();
  });

  it("orders finishers by time then unfinished riders by checkpoint and progress", () => {
    const finishA = createRider("a", 0);
    const finishB = createRider("b", 1);
    const chasing = createRider("c", 2);
    const behind = createRider("d", 3);
    finishA.finishedAt = 39_000;
    finishB.finishedAt = 41_000;
    Object.assign(chasing, { checkpoint: 3, progress: 700 });
    Object.assign(behind, { checkpoint: 2, progress: 760 });
    expect(
      [behind, finishB, chasing, finishA].sort(compareRaceOrder).map((rider) => rider.id),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("publishes race data without controller state or internal jump/off-trail latches", () => {
    const state = createState();
    const rider = createRider("p1", 0);
    rider.input.pedal = true;
    rider.offTrailMs = 200;
    rider.jumpReady = false;
    state.riders.push(rider);
    const [publicRider] = snapshotRiders(state);
    expect(publicRider).not.toHaveProperty("input");
    expect(publicRider).not.toHaveProperty("offTrailMs");
    expect(publicRider).not.toHaveProperty("jumpReady");
    expect(publicRider).toMatchObject({ id: "p1", ready: false, rearView: false, rescueCount: 0 });
  });
});
