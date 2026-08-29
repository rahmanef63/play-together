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
  gun: boolean;
  missile: boolean;
}
interface Plane {
  id: string;
  name: string;
  bot: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  hp: number;
  kills: number;
  deaths: number;
  respawnMs: number;
  gunCd: number;
  missileCd: number;
  lockId: string | null;
  input: InputState;
}
interface Shot {
  id: number;
  kind: "bullet" | "missile";
  ownerId: string;
  targetId: string | null;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
}
interface State {
  kind: "sky-strike";
  phase: "dogfight" | "round-over";
  round: number;
  roundResetMs: number;
  winnerId: string | null;
  planes: Plane[];
  shots: Shot[];
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const d3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const forward = (p: { heading: number; pitch: number }) => ({
  x: Math.sin(p.heading) * Math.cos(p.pitch),
  y: Math.sin(p.pitch),
  z: Math.cos(p.heading) * Math.cos(p.pitch),
});
class SkyStrike implements ServerGame {
  readonly #s: State = {
    kind: "sky-strike",
    phase: "dogfight",
    round: 1,
    roundResetMs: 0,
    winnerId: null,
    planes: [],
    shots: [],
  };
  #shotId = 0;
  constructor(ctx: ServerGameContext) {
    for (let i = 0; i < 3; i++)
      this.#s.planes.push(
        this.#spawn(`bandit-${i + 1}`, `BANDIT ${i + 1}`, true, i + 10, ctx.seed),
      );
  }
  #spawn(id: string, name: string, bot: boolean, index: number, seed = 1): Plane {
    const a = (index * 2.17 + seed * 0.013) % (Math.PI * 2);
    return {
      id,
      name,
      bot,
      x: Math.cos(a) * 75,
      y: 34 + (index % 3) * 12,
      z: Math.sin(a) * 75,
      heading: wrapAngle(a + Math.PI),
      pitch: 0,
      roll: 0,
      speed: 38 + (index % 3) * 3,
      hp: 100,
      kills: 0,
      deaths: 0,
      respawnMs: 0,
      gunCd: 0,
      missileCd: 700 + index * 180,
      lockId: null,
      input: { pitch: 0, roll: 0, yaw: 0, throttle: 0.65, gun: false, missile: false },
    };
  }
  onJoin(p: ServerPlayer) {
    if (this.#s.planes.some((x) => x.id === p.id)) return;
    const n = this.#s.planes.filter((x) => !x.bot).length;
    if (n >= 4) return;
    this.#s.planes.push(this.#spawn(p.id, `PILOT ${n + 1}`, false, n + 1));
  }
  onLeave(id: string) {
    this.#s.planes = this.#s.planes.filter((p) => p.bot || p.id !== id);
    this.#s.shots = this.#s.shots.filter((s) => s.ownerId !== id && s.targetId !== id);
  }
  onInput(id: string, payload: unknown) {
    if (typeof payload !== "object" || !payload) return;
    const p = this.#s.planes.find((x) => x.id === id && !x.bot);
    if (!p) return;
    const v = payload as Partial<InputState>;
    for (const k of ["pitch", "roll", "yaw", "throttle"] as const)
      if (v[k] !== undefined && (typeof v[k] !== "number" || !Number.isFinite(v[k]!))) return;
    if (v.gun !== undefined && typeof v.gun !== "boolean") return;
    if (v.missile !== undefined && typeof v.missile !== "boolean") return;
    p.input = {
      pitch: clamp(Number(v.pitch ?? p.input.pitch), -1, 1),
      roll: clamp(Number(v.roll ?? p.input.roll), -1, 1),
      yaw: clamp(Number(v.yaw ?? p.input.yaw), -1, 1),
      throttle: clamp(Number(v.throttle ?? p.input.throttle), 0, 1),
      gun: Boolean(v.gun ?? p.input.gun),
      missile: Boolean(v.missile ?? p.input.missile),
    };
  }
  tick(_now: number, delta: number) {
    const ms = clamp(delta, 0, 50),
      dt = ms / 1000;
    if (this.#s.phase === "round-over") {
      this.#s.roundResetMs -= ms;
      if (this.#s.roundResetMs <= 0) this.#resetRound();
      return;
    }
    for (const p of this.#s.planes) {
      if (p.respawnMs > 0) {
        p.respawnMs -= ms;
        if (p.respawnMs <= 0) this.#respawn(p);
        continue;
      }
      if (p.bot) this.#botInput(p);
      p.gunCd = Math.max(0, p.gunCd - ms);
      p.missileCd = Math.max(0, p.missileCd - ms);
      p.lockId = this.#findLock(p)?.id ?? null;
      const turn = 0.5 + Math.abs(p.roll) * 1.1 + p.input.yaw * 0.55;
      p.heading = wrapAngle(p.heading + (p.input.roll * turn + p.input.yaw * 0.65) * dt);
      p.pitch = clamp(p.pitch + p.input.pitch * 1.05 * dt, -0.72, 0.72);
      p.roll += (p.input.roll * 0.95 - p.roll) * 3.4 * dt;
      p.speed += (24 + p.input.throttle * 48 - p.speed) * 1.7 * dt;
      const f = forward(p);
      p.x += f.x * p.speed * dt;
      p.y = clamp(p.y + f.y * p.speed * dt, 6, 150);
      p.z += f.z * p.speed * dt;
      if (Math.abs(p.x) > 230) p.x = -Math.sign(p.x) * 230;
      if (Math.abs(p.z) > 230) p.z = -Math.sign(p.z) * 230;
      if (p.input.gun && p.gunCd <= 0) {
        this.#fireBullet(p);
        p.gunCd = 115;
      }
      if (p.input.missile && p.missileCd <= 0 && p.lockId) {
        this.#fireMissile(p, p.lockId);
        p.missileCd = 2200;
      }
    }
    for (const s of this.#s.shots) {
      s.ttl -= ms;
      if (s.kind === "missile" && s.targetId) {
        const t = this.#s.planes.find((p) => p.id === s.targetId && p.respawnMs <= 0);
        if (t) {
          const dx = t.x - s.x,
            dy = t.y - s.y,
            dz = t.z - s.z,
            d = Math.hypot(dx, dy, dz) || 1;
          const aim = 92,
            blend = Math.min(1, dt * 2.8);
          s.vx += ((dx / d) * aim - s.vx) * blend;
          s.vy += ((dy / d) * aim - s.vy) * blend;
          s.vz += ((dz / d) * aim - s.vz) * blend;
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      this.#hitTest(s);
    }
    this.#s.shots = this.#s.shots.filter((s) => s.ttl > 0);
    const victor = this.#s.planes.find((p) => p.kills >= 5);
    if (victor) {
      this.#s.phase = "round-over";
      this.#s.winnerId = victor.id;
      this.#s.roundResetMs = 4000;
    }
  }
  #botInput(p: Plane) {
    const humans = this.#s.planes.filter((x) => !x.bot && x.respawnMs <= 0);
    const t = humans.sort((a, b) => d3(p, a) - d3(p, b))[0];
    if (!t) {
      p.input = { pitch: 0, roll: 0.25, yaw: 0, throttle: 0.7, gun: false, missile: false };
      return;
    }
    const desired = Math.atan2(t.x - p.x, t.z - p.z),
      err = wrapAngle(desired - p.heading),
      pitchErr = Math.atan2(t.y - p.y, Math.hypot(t.x - p.x, t.z - p.z)) - p.pitch;
    p.input = {
      roll: clamp(err * 1.35, -1, 1),
      yaw: clamp(err * 0.45, -1, 1),
      pitch: clamp(pitchErr * 1.8, -1, 1),
      throttle: 0.72,
      gun: Math.abs(err) < 0.11 && Math.abs(pitchErr) < 0.09 && d3(p, t) < 115,
      missile: Math.abs(err) < 0.28 && Math.abs(pitchErr) < 0.2 && d3(p, t) < 160,
    };
  }
  #findLock(p: Plane) {
    const f = forward(p);
    let best: Plane | undefined,
      bestScore = Infinity;
    for (const t of this.#s.planes) {
      if (t.id === p.id || t.respawnMs > 0) continue;
      const dx = t.x - p.x,
        dy = t.y - p.y,
        dz = t.z - p.z,
        d = Math.hypot(dx, dy, dz) || 1;
      if (d > 175) continue;
      const dot = (dx / d) * f.x + (dy / d) * f.y + (dz / d) * f.z;
      if (dot < 0.72) continue;
      const score = d - dot * 35;
      if (score < bestScore) {
        best = t;
        bestScore = score;
      }
    }
    return best;
  }
  #fireBullet(p: Plane) {
    const f = forward(p),
      speed = 150;
    this.#s.shots.push({
      id: ++this.#shotId,
      kind: "bullet",
      ownerId: p.id,
      targetId: null,
      x: p.x + f.x * 3,
      y: p.y + f.y * 3,
      z: p.z + f.z * 3,
      vx: f.x * speed,
      vy: f.y * speed,
      vz: f.z * speed,
      ttl: 1350,
    });
  }
  #fireMissile(p: Plane, targetId: string) {
    const f = forward(p),
      speed = 78;
    this.#s.shots.push({
      id: ++this.#shotId,
      kind: "missile",
      ownerId: p.id,
      targetId,
      x: p.x + f.x * 3,
      y: p.y - 1,
      z: p.z + f.z * 3,
      vx: f.x * speed,
      vy: f.y * speed,
      vz: f.z * speed,
      ttl: 5200,
    });
  }
  #hitTest(s: Shot) {
    for (const t of this.#s.planes) {
      if (t.id === s.ownerId || t.respawnMs > 0) continue;
      const radius = s.kind === "missile" ? 5 : 2.5;
      if (d3(s, t) > radius) continue;
      t.hp -= s.kind === "missile" ? 48 : 11;
      s.ttl = 0;
      if (t.hp <= 0) {
        t.hp = 0;
        t.deaths++;
        t.respawnMs = 2500;
        const owner = this.#s.planes.find((p) => p.id === s.ownerId);
        if (owner) owner.kills++;
      }
      break;
    }
  }
  #respawn(p: Plane) {
    const a = (p.deaths * 1.7 + p.kills * 0.4) % (Math.PI * 2);
    p.x = Math.cos(a) * 85;
    p.z = Math.sin(a) * 85;
    p.y = 42;
    p.heading = wrapAngle(a + Math.PI);
    p.pitch = 0;
    p.roll = 0;
    p.speed = 40;
    p.hp = 100;
    p.respawnMs = 0;
    p.gunCd = 500;
    p.missileCd = 1200;
  }
  #resetRound() {
    this.#s.phase = "dogfight";
    this.#s.round++;
    this.#s.winnerId = null;
    for (const p of this.#s.planes) {
      p.kills = 0;
      p.deaths = 0;
      this.#respawn(p);
    }
    this.#s.shots = [];
  }
  snapshot() {
    return structuredClone({ ...this.#s, planes: this.#s.planes.map(({ input, ...p }) => p) });
  }
}
export const createServerGame: CreateServerGame = (ctx) => new SkyStrike(ctx);
