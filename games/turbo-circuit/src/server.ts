import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import { createBot, updateBotDriver } from "./server/botDriver.js";
import { updateHumanDriver } from "./server/driverPhysics.js";
import {
  dist,
  type InputState,
  type Racer,
  type RaceState,
  resolveCollisions,
} from "./server/raceModel.js";
import { applySetupInput, resetGrid } from "./server/setup.js";
import { CARS, circuitCheckpoints, clamp, DEFAULT_CAR, DEFAULT_CIRCUIT } from "./shared/catalog.js";

class TurboCircuit implements ServerGame {
  readonly #s: RaceState;
  #clock = 0;
  #readyClock = 0;
  constructor(ctx: ServerGameContext) {
    const circuit = DEFAULT_CIRCUIT;
    this.#s = {
      kind: "turbo-circuit",
      phase: "setup",
      countdownMs: 3000,
      raceMs: 0,
      paused: false,
      lapsToWin: circuit.laps,
      circuitId: circuit.id,
      track: {
        id: circuit.id,
        name: circuit.name,
        width: circuit.width,
        checkpoints: circuitCheckpoints(circuit),
      },
      racers: Array.from({ length: 3 }, (_, index) => createBot(index, ctx.seed, circuit.id)),
      winnerId: null,
    };
  }
  onJoin(player: ServerPlayer) {
    if (this.#s.racers.some((racer) => racer.id === player.id)) return;
    const humans = this.#s.racers.filter((racer) => !racer.bot);
    if (humans.length >= 4 || this.#s.phase !== "setup") return;
    this.#s.racers.push(this.#human(player.id, humans.length));
    resetGrid(this.#s);
  }
  onLeave(id: string) {
    this.#s.racers = this.#s.racers.filter((racer) => racer.bot || racer.id !== id);
    if (this.#s.phase === "setup") resetGrid(this.#s);
  }
  onInput(id: string, payload: unknown) {
    if (typeof payload !== "object" || payload === null) return;
    const racer = this.#s.racers.find((item) => item.id === id && !item.bot);
    if (!racer) return;
    const patch = payload as Partial<InputState>;
    if (!validInput(patch)) return;
    racer.input = {
      steer: clamp(Number(patch.steer ?? racer.input.steer), -1, 1),
      menuY: clamp(Number(patch.menuY ?? racer.input.menuY), -1, 1),
      drive: Boolean(patch.drive ?? racer.input.drive),
      brake: clamp(Number(patch.brake ?? racer.input.brake), 0, 1),
      boost: Boolean(patch.boost ?? racer.input.boost),
      cockpit: Boolean(patch.cockpit ?? racer.input.cockpit),
      rearView: Boolean(patch.rearView ?? racer.input.rearView),
      pause: Boolean(patch.pause ?? false),
    };
    racer.cockpit = racer.input.cockpit;
    racer.rearView = racer.input.rearView;
    if (patch.pause === true && this.#s.phase !== "setup" && this.#s.phase !== "finished")
      this.#s.paused = !this.#s.paused;
    if (this.#s.phase === "setup") applySetupInput(this.#s, racer, patch);
  }
  tick(_now: number, delta: number) {
    const ms = clamp(delta, 0, 50);
    if (this.#s.paused) return;
    const dt = ms / 1000;
    if (this.#s.phase === "setup") return this.#tickSetup(ms);
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
    for (const racer of this.#s.racers) {
      if (racer.finished) continue;
      if (racer.bot) updateBotDriver(racer, this.#s, dt);
      else updateHumanDriver(racer, this.#s, dt);
      this.#checkpoint(racer);
    }
    resolveCollisions(this.#s.racers);
    const humans = this.#s.racers.filter((racer) => !racer.bot);
    if (humans.length > 0 && humans.every((racer) => racer.finished)) this.#s.phase = "finished";
  }
  #tickSetup(ms: number) {
    const humans = this.#s.racers.filter((racer) => !racer.bot);
    if (humans.length > 0 && humans.every((racer) => racer.ready)) this.#readyClock += ms;
    else this.#readyClock = 0;
    if (this.#readyClock < 650) return;
    resetGrid(this.#s);
    this.#s.phase = "countdown";
    this.#s.countdownMs = 3000;
    this.#clock = 0;
    this.#readyClock = 0;
  }
  #checkpoint(racer: Racer) {
    const checkpoint = this.#s.track.checkpoints[racer.nextCheckpoint];
    if (!checkpoint || dist(racer, checkpoint) > Math.max(10, this.#s.track.width * 0.72)) return;
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
      autoDrive: false,
      cockpit: false,
      rearView: false,
      x: 0,
      z: 0,
      heading: 0,
      speed: 0,
      lap: 0,
      nextCheckpoint: 1,
      nitro: 100,
      finished: false,
      finishMs: null,
      steering: 0,
      menuXActive: false,
      menuYActive: false,
      input: {
        steer: 0,
        menuY: 0,
        drive: false,
        brake: 0,
        boost: false,
        cockpit: false,
        rearView: false,
        pause: false,
      },
    };
  }
  snapshot() {
    const racers = this.#s.racers.map(
      ({ input, menuXActive, menuYActive, brain, ...racer }) => racer,
    );
    return structuredClone({ ...this.#s, racers });
  }
}

function validInput(input: Partial<InputState>) {
  return (
    (input.steer === undefined || typeof input.steer === "number") &&
    (input.menuY === undefined || typeof input.menuY === "number") &&
    (input.drive === undefined || typeof input.drive === "boolean") &&
    (input.brake === undefined || typeof input.brake === "number") &&
    (input.boost === undefined || typeof input.boost === "boolean") &&
    (input.cockpit === undefined || typeof input.cockpit === "boolean") &&
    (input.rearView === undefined || typeof input.rearView === "boolean") &&
    (input.pause === undefined || typeof input.pause === "boolean")
  );
}
export const createServerGame: CreateServerGame = (ctx) => new TurboCircuit(ctx);
