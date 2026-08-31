import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

interface InputState {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  flaps: boolean;
  gear: boolean;
  restart: boolean;
}
interface Aircraft {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  airspeed: number;
  verticalSpeed: number;
  throttle: number;
  flaps: boolean;
  gearDown: boolean;
  stall: boolean;
  crashed: boolean;
  landed: boolean;
  missionComplete: boolean;
  nextCheckpoint: number;
  elapsedMs: number;
  score: number;
  input: InputState;
}
interface State {
  kind: "flight-trainer";
  runway: { x: number; zMin: number; zMax: number; width: number };
  checkpoints: Array<{ x: number; y: number; z: number; label: string }>;
  aircraft: Aircraft[];
}
const CPS = [
  { x: 0, y: 24, z: -25, label: "TAKEOFF" },
  { x: 78, y: 45, z: 35, label: "TURN 1" },
  { x: 25, y: 68, z: 125, label: "CLIMB" },
  { x: -92, y: 56, z: 82, label: "TURN 2" },
  { x: -72, y: 38, z: -18, label: "DESCEND" },
  { x: 0, y: 16, z: -78, label: "FINAL" },
];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const d3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
class FlightTrainer implements ServerGame {
  readonly #s: State = {
    kind: "flight-trainer",
    runway: { x: 0, zMin: -175, zMax: -45, width: 22 },
    checkpoints: CPS,
    aircraft: [],
  };
  constructor(_ctx: ServerGameContext) {}
  onJoin(p: ServerPlayer) {
    if (this.#s.aircraft.some((a) => a.id === p.id) || this.#s.aircraft.length >= 4) return;
    this.#s.aircraft.push(
      this.#fresh(p.id, `PILOT ${this.#s.aircraft.length + 1}`, this.#s.aircraft.length),
    );
  }
  onLeave(id: string) {
    this.#s.aircraft = this.#s.aircraft.filter((a) => a.id !== id);
  }
  #fresh(id: string, name: string, lane = 0): Aircraft {
    return {
      id,
      name,
      x: (lane - 1.5) * 3,
      y: 1.2,
      z: -145 - lane * 6,
      heading: 0,
      pitch: 0,
      roll: 0,
      airspeed: 0,
      verticalSpeed: 0,
      throttle: 0,
      flaps: false,
      gearDown: true,
      stall: false,
      crashed: false,
      landed: false,
      missionComplete: false,
      nextCheckpoint: 0,
      elapsedMs: 0,
      score: 0,
      input: { pitch: 0, roll: 0, yaw: 0, throttle: 0, flaps: false, gear: true, restart: false },
    };
  }
  onInput(id: string, payload: unknown) {
    if (typeof payload !== "object" || !payload) return;
    const a = this.#s.aircraft.find((x) => x.id === id);
    if (!a) return;
    const p = payload as Partial<InputState>;
    if (p.restart === true && a.crashed) {
      const fresh = this.#fresh(a.id, a.name, this.#s.aircraft.indexOf(a));
      Object.assign(a, fresh);
      return;
    }
    for (const k of ["pitch", "roll", "yaw", "throttle"] as const)
      if (p[k] !== undefined && (typeof p[k] !== "number" || !Number.isFinite(p[k]!))) return;
    if (p.flaps !== undefined && typeof p.flaps !== "boolean") return;
    if (p.gear !== undefined && typeof p.gear !== "boolean") return;
    a.input = {
      pitch: clamp(Number(p.pitch ?? a.input.pitch), -1, 1),
      roll: clamp(Number(p.roll ?? a.input.roll), -1, 1),
      yaw: clamp(Number(p.yaw ?? a.input.yaw), -1, 1),
      throttle: clamp(Number(p.throttle ?? a.input.throttle), 0, 1),
      flaps: Boolean(p.flaps ?? a.input.flaps),
      gear: Boolean(p.gear ?? a.input.gear),
      restart: false,
    };
    a.flaps = a.input.flaps;
    a.gearDown = a.input.gear;
  }
  tick(_now: number, delta: number) {
    const ms = clamp(delta, 0, 50),
      dt = ms / 1000;
    for (const a of this.#s.aircraft) {
      if (a.crashed || a.missionComplete) continue;
      a.elapsedMs += ms;
      a.throttle += (a.input.throttle - a.throttle) * 2.2 * dt;
      a.pitch = clamp(a.pitch + a.input.pitch * 0.6 * dt - a.pitch * 0.09 * dt, -0.52, 0.58);
      a.roll = clamp(a.roll + a.input.roll * 0.95 * dt - a.roll * 0.16 * dt, -1.05, 1.05);
      a.heading -= (Math.sin(a.roll) * 0.34 + a.input.yaw * 0.42) * dt;
      const drag = (a.flaps ? 7 : 0) + (a.gearDown && a.y > 2 ? 4 : 0);
      const targetSpeed = 5 + a.throttle * 82 - drag;
      a.airspeed += (targetSpeed - a.airspeed) * (a.y <= 1.21 ? 1.2 : 0.72) * dt;
      a.airspeed = Math.max(0, a.airspeed);
      const stallSpeed = a.flaps ? 20 : 27;
      a.stall = a.y > 2.5 && a.airspeed < stallSpeed;
      if (a.stall) a.pitch = clamp(a.pitch - 0.42 * dt, -0.55, 0.58);
      const wasAirborne = a.y > 1.35;
      const lift = Math.max(0, a.airspeed - stallSpeed) * 0.075 * Math.cos(a.roll);
      const climb = Math.sin(a.pitch) * a.airspeed * 0.62;
      const targetV = a.stall ? -9 : climb + lift - 2.5;
      a.verticalSpeed += (targetV - a.verticalSpeed) * (a.stall ? 1.8 : 1.1) * dt;
      const horizontal = Math.cos(a.pitch) * a.airspeed;
      a.x += Math.sin(a.heading) * horizontal * dt;
      a.z += Math.cos(a.heading) * horizontal * dt;
      a.y += a.verticalSpeed * dt;
      if (a.y <= 1.2) {
        const runway =
          Math.abs(a.x) <= this.#s.runway.width / 2 &&
          a.z >= this.#s.runway.zMin &&
          a.z <= this.#s.runway.zMax;
        if (wasAirborne) {
          const safe =
            runway &&
            a.gearDown &&
            Math.abs(a.verticalSpeed) < 6.2 &&
            a.airspeed < 37 &&
            Math.abs(a.roll) < 0.24 &&
            Math.abs(a.pitch) < 0.3;
          if (safe) {
            a.landed = true;
            a.score += 250;
          } else {
            a.crashed = true;
            a.airspeed = 0;
            a.verticalSpeed = 0;
            a.y = 1.2;
            continue;
          }
        }
        a.y = 1.2;
        a.verticalSpeed = 0;
        if (a.airspeed < 30 || a.pitch < 0.08) a.airspeed *= Math.max(0, 1 - 0.28 * dt);
      }
      const cp = CPS[a.nextCheckpoint];
      if (cp && d3(a, cp) < 14) {
        a.nextCheckpoint++;
        a.score += 100;
        if (a.nextCheckpoint >= CPS.length) {
          a.missionComplete = true;
          a.score += Math.max(0, 600 - Math.floor(a.elapsedMs / 1000));
        }
      }
      if (Math.abs(a.x) > 480 || Math.abs(a.z) > 480 || a.y > 260) {
        a.crashed = true;
        a.airspeed = 0;
      }
    }
  }
  snapshot() {
    return structuredClone({ ...this.#s, aircraft: this.#s.aircraft.map(({ input, ...a }) => a) });
  }
}
export const createServerGame: CreateServerGame = (ctx) => new FlightTrainer(ctx);
