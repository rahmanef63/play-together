import { describe, expect, it } from "vitest";
import { DEFAULT_CAR, DEFAULT_TRACK } from "../shared/catalog.js";
import { sampleTrack, trackCorridorInfo } from "../shared/trackMath.js";
import { updateHumanDriver } from "./kartMechanics.js";
import { emptyInput, type Racer, type RaceState } from "./raceModel.js";

function fixture() {
  const start = sampleTrack(DEFAULT_TRACK)[0];
  if (!start) throw new Error("Track sample missing");
  const racer: Racer = {
    id: "p",
    name: "P1",
    bot: false,
    carId: DEFAULT_CAR.id,
    ready: true,
    cameraMode: "chase",
    rearView: false,
    x: start.x,
    z: start.z,
    heading: start.heading,
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
    invulnerableTimer: 0,
    rescueCooldown: 0,
    scraping: false,
    wrongWay: false,
    wrongWayTimer: 0,
    menuXActive: false,
    menuYActive: false,
    input: emptyInput(),
  };
  const state: RaceState = {
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
      checkpoints: [],
    },
    racers: [racer],
    pickups: [],
    worldItems: [],
    winnerId: null,
  };
  return { racer, state, start };
}
describe("kart corridor feedback", () => {
  it("glides along a wall instead of dead-stopping", () => {
    const { racer, state, start } = fixture(),
      rightX = Math.cos(start.heading),
      rightZ = -Math.sin(start.heading);
    racer.x += rightX * (DEFAULT_TRACK.width / 2 + 3);
    racer.z += rightZ * (DEFAULT_TRACK.width / 2 + 3);
    updateHumanDriver(racer, state, 0.05);
    const corridor = trackCorridorInfo(DEFAULT_TRACK, racer.x, racer.z);
    expect(racer.scraping).toBe(true);
    expect(Math.abs(corridor.lateral)).toBeLessThan(DEFAULT_TRACK.width / 2);
    expect(racer.speed).toBeGreaterThan(5);
  });
  it("requires sustained reverse alignment before wrong-way state", () => {
    const { racer, state, start } = fixture();
    racer.heading = start.heading + Math.PI;
    for (let index = 0; index < 14; index++) updateHumanDriver(racer, state, 0.05);
    expect(racer.wrongWay).toBe(true);
    expect(racer.wrongWayTimer).toBeGreaterThan(0.6);
  });
});

describe("kart boost and wall regressions", () => {
  it("requires gas for boost power and lets braking override it", () => {
    const idleBoost = fixture(),
      idlePlain = fixture();
    idleBoost.racer.boostTimer = 1;
    idlePlain.racer.boostTimer = 0;
    updateHumanDriver(idleBoost.racer, idleBoost.state, 0.05);
    updateHumanDriver(idlePlain.racer, idlePlain.state, 0.05);
    expect(idleBoost.racer.speed).toBeCloseTo(idlePlain.racer.speed, 8);

    const brakingBoost = fixture(),
      brakingPlain = fixture();
    brakingBoost.racer.boostTimer = 1;
    brakingBoost.racer.input.brake = 1;
    brakingPlain.racer.input.brake = 1;
    brakingBoost.racer.input.throttle = 1;
    brakingPlain.racer.input.throttle = 1;
    updateHumanDriver(brakingBoost.racer, brakingBoost.state, 0.05);
    updateHumanDriver(brakingPlain.racer, brakingPlain.state, 0.05);
    expect(brakingBoost.racer.speed).toBeCloseTo(brakingPlain.racer.speed, 8);
  });

  it("does not accelerate a stopped kart while it is pinned against a wall", () => {
    const { racer, state, start } = fixture();
    const rightX = Math.cos(start.heading),
      rightZ = -Math.sin(start.heading);
    racer.speed = 0;
    racer.input.throttle = 0;
    racer.x += rightX * (DEFAULT_TRACK.width / 2 + 3);
    racer.z += rightZ * (DEFAULT_TRACK.width / 2 + 3);
    updateHumanDriver(racer, state, 0.05);
    expect(racer.speed).toBe(0);
  });
});
