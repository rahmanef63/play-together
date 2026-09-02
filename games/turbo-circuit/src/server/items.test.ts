import { describe, expect, it } from "vitest";
import { trackById } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
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
    invulnerableTimer: 0,
    rescueCooldown: 0,
    scraping: false,
    wrongWay: false,
    wrongWayTimer: 0,
    menuXActive: false,
    menuYActive: false,
    input: emptyInput(),
  };
}
function state(): RaceState {
  const track = trackById("neo-metro"),
    start = required(sampleTrack(track)[0]),
    a = racer("a", start.x, start.z),
    b = racer("b", start.x + Math.sin(start.heading) * 7, start.z + Math.cos(start.heading) * 7);
  a.heading = start.heading;
  b.heading = start.heading;
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
    b.coins = 5;
    a.item = "PULSE";
    useHeldItem(s, a, "forward");
    expect(s.worldItems[0]?.type).toBe("pulse");
    for (let i = 0; i < 8; i++) updateWorldItems(s, 50);
    expect(b.spinTimer).toBeGreaterThan(0);
    expect(b.invulnerableTimer).toBeGreaterThan(2);
    expect(b.coins).toBe(3);
    expect(s.worldItems).toHaveLength(0);
  });
  it("bounces PULSE projectiles off the track corridor", () => {
    const s = state(),
      track = trackById(s.trackId),
      point = required(sampleTrack(track)[0]),
      rightX = Math.cos(point.heading),
      rightZ = -Math.sin(point.heading),
      edge = track.width / 2 - 0.25;
    s.racers = [];
    s.worldItems = [
      {
        id: "bounce",
        type: "pulse",
        x: point.x + rightX * edge,
        z: point.z + rightZ * edge,
        vx: rightX * 35,
        vz: rightZ * 35,
        ownerId: "a",
        ttlMs: 2000,
        armMs: 0,
        bounces: 0,
      },
    ];
    updateWorldItems(s, 50);
    const projectile = required(s.worldItems[0]);
    expect(projectile.bounces).toBe(1);
    expect(projectile.vx * rightX + projectile.vz * rightZ).toBeLessThan(0);
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
