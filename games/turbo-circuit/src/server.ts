import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

type Phase = "countdown" | "racing" | "finished";
interface InputState {
  steer: number;
  throttle: number;
  brake: number;
  boost: boolean;
}
interface Racer {
  id: string;
  name: string;
  bot: boolean;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  nitro: number;
  finished: boolean;
  finishMs: number | null;
  steering: number;
  input: InputState;
}
interface RaceState {
  kind: "turbo-circuit";
  phase: Phase;
  countdownMs: number;
  raceMs: number;
  lapsToWin: number;
  track: { rx: number; rz: number; width: number; checkpoints: Array<{ x: number; z: number }> };
  racers: Racer[];
  winnerId: string | null;
}
const RX = 62,
  RZ = 38,
  WIDTH = 16,
  LAPS = 3;
const CPS = [
  { x: RX, z: 0 },
  { x: 0, z: RZ },
  { x: -RX, z: 0 },
  { x: 0, z: -RZ },
];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
function trackDeviation(x: number, z: number) {
  const q = Math.hypot(x / RX, z / RZ) || 1;
  const cx = x / q,
    cz = z / q;
  return Math.hypot(x - cx, z - cz);
}
function tangentHeading(angle: number) {
  const dx = -RX * Math.sin(angle),
    dz = RZ * Math.cos(angle);
  return Math.atan2(dx, dz);
}
class TurboCircuit implements ServerGame {
  readonly #s: RaceState = {
    kind: "turbo-circuit",
    phase: "countdown",
    countdownMs: 3000,
    raceMs: 0,
    lapsToWin: LAPS,
    track: { rx: RX, rz: RZ, width: WIDTH, checkpoints: CPS },
    racers: [],
    winnerId: null,
  };
  #clock = 0;
  constructor(_ctx: ServerGameContext) {
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 - (i + 1) * 0.11;
      this.#s.racers.push({
        id: `ai-${i + 1}`,
        name: `CPU ${i + 1}`,
        bot: true,
        x: RX * Math.cos(angle),
        z: RZ * Math.sin(angle),
        heading: tangentHeading(angle),
        speed: 25 + i * 1.4,
        lap: 0,
        nextCheckpoint: 0,
        nitro: 100,
        finished: false,
        finishMs: null,
        steering: 0,
        input: { steer: 0, throttle: 1, brake: 0, boost: false },
      });
    }
  }
  onJoin(p: ServerPlayer) {
    if (this.#s.racers.some((r) => r.id === p.id)) return;
    const humans = this.#s.racers.filter((r) => !r.bot);
    if (humans.length >= 4) return;
    const lane = (humans.length - 1.5) * 2.4;
    this.#s.racers.push({
      id: p.id,
      name: `P${humans.length + 1}`,
      bot: false,
      x: lane,
      z: -RZ,
      heading: Math.PI / 2,
      speed: 0,
      lap: 0,
      nextCheckpoint: 0,
      nitro: 100,
      finished: false,
      finishMs: null,
      steering: 0,
      input: { steer: 0, throttle: 0, brake: 0, boost: false },
    });
  }
  onLeave(id: string) {
    this.#s.racers = this.#s.racers.filter((r) => r.bot || r.id !== id);
  }
  onInput(id: string, payload: unknown) {
    if (typeof payload !== "object" || payload === null) return;
    const r = this.#s.racers.find((x) => x.id === id && !x.bot);
    if (!r) return;
    const p = payload as Partial<InputState>;
    if (p.steer !== undefined && typeof p.steer !== "number") return;
    if (p.throttle !== undefined && typeof p.throttle !== "number") return;
    if (p.brake !== undefined && typeof p.brake !== "number") return;
    if (p.boost !== undefined && typeof p.boost !== "boolean") return;
    r.input = {
      steer: clamp(Number(p.steer ?? r.input.steer), -1, 1),
      throttle: clamp(Number(p.throttle ?? r.input.throttle), 0, 1),
      brake: clamp(Number(p.brake ?? r.input.brake), 0, 1),
      boost: Boolean(p.boost ?? r.input.boost),
    };
  }
  tick(_now: number, delta: number) {
    const ms = clamp(delta, 0, 50),
      dt = ms / 1000;
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
    this.#updateBots(dt);
    for (const r of this.#s.racers) {
      if (r.bot || r.finished) continue;
      const input = r.input;
      const steerTarget = Math.abs(input.steer) < 0.08 ? 0 : input.steer;
      const steerAlpha = 1 - Math.exp(-9 * dt);
      r.steering += (steerTarget - r.steering) * steerAlpha;
      const devBeforeMove = trackDeviation(r.x, r.z);
      const onTrack = devBeforeMove <= WIDTH * 0.62;
      const boosting = input.boost && r.nitro > 1 && input.throttle > 0.2;
      const rollingDrag = onTrack
        ? 1.15 + Math.abs(r.speed) * 0.028
        : 4.8 + Math.abs(r.speed) * 0.085;
      const accel = input.throttle * (boosting ? 32 : 24) - input.brake * 36 - rollingDrag;
      r.speed = clamp(r.speed + accel * dt, -6, boosting ? 56 : 44);
      if (input.throttle < 0.02 && input.brake < 0.02 && Math.abs(r.speed) < 0.4) r.speed = 0;
      if (boosting) r.nitro = Math.max(0, r.nitro - 27 * dt);
      else r.nitro = Math.min(100, r.nitro + 8 * dt);

      const speedRatio = clamp(Math.abs(r.speed) / 44, 0, 1);
      const steeringAuthority = 1.12 - speedRatio * 0.34;
      const motionGrip = clamp(Math.abs(r.speed) / 7, 0, 1);
      r.heading -= r.steering * 2.08 * steeringAuthority * motionGrip * dt * (r.speed < 0 ? -1 : 1);
      r.x += Math.sin(r.heading) * r.speed * dt;
      r.z += Math.cos(r.heading) * r.speed * dt;

      const dev = trackDeviation(r.x, r.z);
      if (dev > WIDTH * 0.72) {
        const q = Math.hypot(r.x / RX, r.z / RZ) || 1,
          tx = r.x / q,
          tz = r.z / q;
        const recovery = dev > WIDTH * 1.7 ? 2.4 : 1.05;
        r.x += (tx - r.x) * recovery * dt;
        r.z += (tz - r.z) * recovery * dt;
        r.speed *= Math.max(0, 1 - (dev > WIDTH * 1.7 ? 1.7 : 0.75) * dt);
      }
      this.#checkpoint(r);
    }
    this.#collisions();
    const humans = this.#s.racers.filter((r) => !r.bot);
    if (humans.length > 0 && humans.every((r) => r.finished)) this.#s.phase = "finished";
  }
  #updateBots(dt: number) {
    for (const [i, r] of this.#s.racers.filter((r) => r.bot).entries()) {
      if (r.finished) continue;
      let angle = Math.atan2(r.z / RZ, r.x / RX);
      angle += dt * (0.39 + i * 0.012);
      r.x = RX * Math.cos(angle);
      r.z = RZ * Math.sin(angle);
      r.heading = tangentHeading(angle);
      r.speed = 25 + i * 1.6 + Math.sin(this.#s.raceMs / 1400 + i) * 1.5;
      this.#checkpoint(r);
    }
  }
  #checkpoint(r: Racer) {
    const cp = CPS[r.nextCheckpoint];
    if (!cp || dist(r, cp) > 11) return;
    r.nextCheckpoint += 1;
    if (r.nextCheckpoint >= CPS.length) {
      r.nextCheckpoint = 0;
      r.lap += 1;
      if (r.lap >= LAPS) {
        r.finished = true;
        r.finishMs = this.#s.raceMs;
        this.#s.winnerId ??= r.id;
      }
    }
  }
  #collisions() {
    for (let i = 0; i < this.#s.racers.length; i++)
      for (let j = i + 1; j < this.#s.racers.length; j++) {
        const a = this.#s.racers[i]!,
          b = this.#s.racers[j]!;
        if (dist(a, b) >= 3.2) continue;
        const dx = a.x - b.x,
          dz = a.z - b.z,
          d = Math.hypot(dx, dz) || 1,
          push = (3.2 - d) * 0.5;
        if (!a.bot) {
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          a.speed *= 0.86;
        }
        if (!b.bot) {
          b.x -= (dx / d) * push;
          b.z -= (dz / d) * push;
          b.speed *= 0.86;
        }
      }
  }
  snapshot() {
    const racers = this.#s.racers.map(({ input, steering, ...r }) => r);
    return structuredClone({ ...this.#s, racers });
  }
}
export const createServerGame: CreateServerGame = (ctx) => new TurboCircuit(ctx);
