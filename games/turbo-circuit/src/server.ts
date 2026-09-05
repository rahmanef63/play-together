import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import { createBot, updateBotDriver } from "./server/botDriver.js";
import { applyControlPatch } from "./server/controlInput.js";
import { updateWorldItems, useHeldItem } from "./server/items.js";
import { updateHumanDriver } from "./server/kartMechanics.js";
import { collectPickups, createPickups, deterministicItem, tickPickups } from "./server/pickups.js";
import { applyKartAction } from "./server/raceActions.js";
import {
  emptyInput,
  type Racer,
  type RaceState,
  resolveRacerCollisions,
} from "./server/raceModel.js";
import { finishRaceIfComplete } from "./server/rematch.js";
import { applySetupInput, resetGrid } from "./server/setup.js";
import { CARS, DEFAULT_CAR, DEFAULT_TRACK } from "./shared/catalog.js";
import { trackCheckpoints } from "./shared/trackMath.js";

class TurboCircuit implements ServerGame {
  readonly #s: RaceState;
  readonly #seed: number;
  #clock = 0;
  #readyClock = 0;
  #itemSequence = 0;
  constructor(ctx: ServerGameContext) {
    const track = DEFAULT_TRACK;
    this.#seed = ctx.seed;
    this.#s = {
      kind: "turbo-circuit",
      phase: "setup",
      countdownMs: 3000,
      raceMs: 0,
      paused: false,
      lapsToWin: track.laps,
      trackId: track.id,
      track: {
        id: track.id,
        name: track.name,
        width: track.width,
        checkpoints: trackCheckpoints(track),
      },
      racers: Array.from({ length: 3 }, (_, i) => createBot(i, ctx.seed, track.id)),
      pickups: createPickups(track.id),
      worldItems: [],
      winnerId: null,
    };
    resetGrid(this.#s);
  }
  onJoin(player: ServerPlayer) {
    if (this.#s.racers.some((r) => r.id === player.id)) return;
    const humans = this.#s.racers.filter((r) => !r.bot);
    if (humans.length >= 4 || this.#s.phase !== "setup") return;
    this.#s.racers.push(this.#human(player.id, humans.length));
    resetGrid(this.#s);
  }
  onLeave(id: string) {
    this.#s.racers = this.#s.racers.filter((r) => r.bot || r.id !== id);
    if (this.#s.phase === "setup") resetGrid(this.#s);
  }
  onInput(id: string, payload: unknown) {
    const racer = this.#s.racers.find((r) => r.id === id && !r.bot);
    if (!racer) return;
    const beforeTrack = this.#s.trackId,
      action = applyControlPatch(racer, payload);
    const actionResult = applyKartAction(this.#s, racer, action);
    if (actionResult.resetRaceClock) {
      this.#clock = 0;
      this.#readyClock = 0;
    }
    if (this.#s.phase === "setup") applySetupInput(this.#s, racer);
    if (beforeTrack !== this.#s.trackId) this.#s.pickups = createPickups(this.#s.trackId);
  }
  tick(_now: number, delta: number) {
    if (!Number.isFinite(delta)) return;
    const ms = Math.max(0, Math.min(50, delta));
    if (this.#s.paused) return;
    const dt = ms / 1000;
    if (this.#s.phase === "setup") {
      this.#tickSetup(ms);
      return;
    }
    this.#clock += ms;
    if (this.#s.phase === "countdown") {
      this.#s.countdownMs = Math.max(0, 3000 - this.#clock);
      if (this.#s.countdownMs <= 0) {
        this.#s.phase = "racing";
        this.#clock = 0;
      }
      return;
    }
    if (this.#s.phase !== "racing") return;
    this.#s.raceMs += ms;
    tickPickups(this.#s, ms);
    for (const racer of this.#s.racers) {
      if (racer.finished) continue;
      if (racer.bot) updateBotDriver(racer, this.#s, dt);
      else updateHumanDriver(racer, this.#s, dt);
      collectPickups(this.#s, racer, () =>
        deterministicItem(this.#seed + ++this.#itemSequence * 17),
      );
      if (racer.bot && racer.item && racer.nextCheckpoint % 4 === 0)
        useHeldItem(this.#s, racer, "forward");
      this.#checkpoint(racer);
    }
    updateWorldItems(this.#s, ms);
    resolveRacerCollisions(this.#s.racers);
    finishRaceIfComplete(this.#s);
  }
  #tickSetup(ms: number) {
    const humans = this.#s.racers.filter((r) => !r.bot);
    if (humans.length > 0 && humans.every((r) => r.ready)) this.#readyClock += ms;
    else this.#readyClock = 0;
    if (this.#readyClock < 650) return;
    resetGrid(this.#s);
    this.#s.pickups = createPickups(this.#s.trackId);
    this.#s.phase = "countdown";
    this.#s.countdownMs = 3000;
    this.#clock = 0;
    this.#readyClock = 0;
  }
  #checkpoint(racer: Racer) {
    const cp = this.#s.track.checkpoints[racer.nextCheckpoint];
    if (
      !cp ||
      Math.hypot(racer.x - cp.x, racer.z - cp.z) > Math.max(10, this.#s.track.width * 0.72)
    )
      return;
    racer.nextCheckpoint += 1;
    if (racer.nextCheckpoint < this.#s.track.checkpoints.length) return;
    racer.nextCheckpoint = 0;
    racer.lap += 1;
    if (racer.lap < this.#s.lapsToWin) return;
    racer.finished = true;
    racer.finishMs = this.#s.raceMs;
    this.#s.winnerId ??= racer.id;
  }
  #human(id: string, index: number): Racer {
    return {
      id,
      name: `P${index + 1}`,
      bot: false,
      carId: CARS[index % CARS.length]?.id ?? DEFAULT_CAR.id,
      ready: false,
      cameraMode: "chase",
      rearView: false,
      x: 0,
      z: 0,
      heading: 0,
      speed: 0,
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
  snapshot() {
    const racers = this.#s.racers.map(
      ({ input, menuXActive, menuYActive, brain, ...racer }) => racer,
    );
    return structuredClone({ ...this.#s, racers });
  }
}
export const createServerGame: CreateServerGame = (ctx) => new TurboCircuit(ctx);
