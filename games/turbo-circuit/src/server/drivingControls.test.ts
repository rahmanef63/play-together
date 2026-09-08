import { expect, it } from "vitest";
import { createServerGame } from "../server.js";
import { DEFAULT_TRACK } from "../shared/catalog.js";
import { nearestTrackPoint } from "../shared/trackMath.js";
import { createBot } from "./botDriver.js";
import { updateDrift } from "./drivingControls.js";
import { rescueRacer, resetRacerToGrid, updateHumanDriver } from "./kartMechanics.js";
import type { RaceState } from "./raceModel.js";

async function fixture() {
  const game = await createServerGame({
    roomId: "test",
    gameId: "turbo-circuit",
    gameVersion: "0.12.0",
    seed: 1,
  });
  const state = game.snapshot() as RaceState;
  const racer = createBot(0, 1, DEFAULT_TRACK.id);
  racer.bot = false;
  state.racers = [racer];
  state.phase = "racing";
  return { racer, state };
}
it("charges and releases mini-turbo with just B and the main stick", async () => {
  const { racer } = await fixture();
  racer.speed = 30;
  racer.steering = 0.6;
  racer.input.brake = 1;
  for (let tick = 0; tick < 90; tick++) updateDrift(racer, 1 / 60);
  expect(racer.input.drift).toBe(false);
  expect(racer.driftTier).toBe(2);
  racer.input.brake = 0;
  updateDrift(racer, 1 / 60);
  expect(racer.drifting).toBe(false);
  expect(racer.boostTimer).toBeGreaterThan(2);
});
it("a straight B press brakes fully; corner braking retains speed for a usable drift", async () => {
  const straight = await fixture(),
    corner = await fixture();
  for (const { racer } of [straight, corner]) {
    racer.speed = 30;
    racer.input.brake = 1;
  }
  corner.racer.steering = corner.racer.input.steer = 0.6;
  updateHumanDriver(straight.racer, straight.state, 0.05);
  updateHumanDriver(corner.racer, corner.state, 0.05);
  expect(corner.racer.speed).toBeGreaterThan(straight.racer.speed);
  expect(corner.racer.drifting).toBe(true);
  expect(straight.racer.drifting).toBe(false);
});
it("holding B stopped rescues to the road and requires a fresh gas tap", async () => {
  const { racer, state } = await fixture();
  racer.heading += Math.PI;
  racer.input.brake = 1;
  racer.cruiseActive = true;
  for (let tick = 0; tick < 19; tick++) updateHumanDriver(racer, state, 0.05);
  expect(racer.rescueCooldown).toBe(0);
  updateHumanDriver(racer, state, 0.05);
  expect(racer.rescueCooldown).toBeGreaterThan(2);
  expect(racer.cruiseActive).toBe(false);
  expect(racer.speed).toBe(0);
  expect(racer.heading).toBeCloseTo(nearestTrackPoint(DEFAULT_TRACK, racer.x, racer.z).heading);
  expect(racer.invulnerableTimer).toBeGreaterThan(2);
  racer.recoveryHold = 0.8;
  racer.input.brake = 0;
  updateHumanDriver(racer, state, 0.05);
  expect(racer.recoveryHold).toBe(0);
  racer.recoveryHold = 0.8;
  racer.rescueCooldown = 0;
  rescueRacer(racer, state);
  expect(racer.recoveryHold).toBe(0);
  racer.recoveryHold = 0.8;
  resetRacerToGrid(racer, state, 0);
  expect(racer.recoveryHold).toBe(0);
});
