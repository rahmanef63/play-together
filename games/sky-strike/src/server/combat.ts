import { clamp, d3, forward, type InputState, type Plane, type Shot, wrapAngle } from "./model.js";

export function botInput(plane: Plane, planes: Plane[]): void {
  const target = planes
    .filter((item) => !item.bot && item.respawnMs <= 0)
    .sort((a, b) => d3(plane, a) - d3(plane, b))[0];
  if (!target) {
    plane.input = {
      pitch: 0,
      roll: 0.25,
      yaw: 0,
      throttle: 0.7,
      gun: false,
      missile: false,
      airbrake: false,
      afterburner: false,
    };
    return;
  }
  const desired = Math.atan2(target.x - plane.x, target.z - plane.z);
  const error = wrapAngle(desired - plane.heading);
  const pitchError =
    Math.atan2(target.y - plane.y, Math.hypot(target.x - plane.x, target.z - plane.z)) -
    plane.pitch;
  plane.input = {
    roll: clamp(-error * 1.35, -1, 1),
    yaw: clamp(-error * 0.45, -1, 1),
    pitch: clamp(pitchError * 1.8, -1, 1),
    throttle: 0.72,
    airbrake: false,
    afterburner: false,
    gun: Math.abs(error) < 0.11 && Math.abs(pitchError) < 0.09 && d3(plane, target) < 115,
    missile: Math.abs(error) < 0.28 && Math.abs(pitchError) < 0.2 && d3(plane, target) < 160,
  };
}

export function findLock(plane: Plane, planes: Plane[]): Plane | undefined {
  const facing = forward(plane);
  let best: Plane | undefined;
  let bestScore = Infinity;
  for (const target of planes) {
    if (target.id === plane.id || target.respawnMs > 0 || target.spawnProtectionMs > 0) continue;
    const dx = target.x - plane.x;
    const dy = target.y - plane.y;
    const dz = target.z - plane.z;
    const distance = Math.hypot(dx, dy, dz) || 1;
    if (distance > 175) continue;
    const dot =
      (dx / distance) * facing.x + (dy / distance) * facing.y + (dz / distance) * facing.z;
    if (dot < 0.72) continue;
    const score = distance - dot * 35;
    if (score < bestScore) {
      best = target;
      bestScore = score;
    }
  }
  return best;
}

export function makeBullet(plane: Plane, id: number): Shot {
  const facing = forward(plane);
  const speed = 150;
  return {
    id,
    kind: "bullet",
    ownerId: plane.id,
    targetId: null,
    x: plane.x + facing.x * 3,
    y: plane.y + facing.y * 3,
    z: plane.z + facing.z * 3,
    vx: facing.x * speed,
    vy: facing.y * speed,
    vz: facing.z * speed,
    ttl: 1350,
  };
}
export function makeMissile(plane: Plane, targetId: string, id: number): Shot {
  const facing = forward(plane);
  const speed = 78;
  return {
    id,
    kind: "missile",
    ownerId: plane.id,
    targetId,
    x: plane.x + facing.x * 3,
    y: plane.y - 1,
    z: plane.z + facing.z * 3,
    vx: facing.x * speed,
    vy: facing.y * speed,
    vz: facing.z * speed,
    ttl: 5200,
  };
}
export function steerMissile(shot: Shot, planes: Plane[], dt: number): void {
  if (shot.kind !== "missile" || !shot.targetId) return;
  const target = planes.find((plane) => plane.id === shot.targetId && plane.respawnMs <= 0);
  if (!target) return;
  const dx = target.x - shot.x;
  const dy = target.y - shot.y;
  const dz = target.z - shot.z;
  const distance = Math.hypot(dx, dy, dz) || 1;
  const aim = 92;
  const blend = Math.min(1, dt * 2.8);
  shot.vx += ((dx / distance) * aim - shot.vx) * blend;
  shot.vy += ((dy / distance) * aim - shot.vy) * blend;
  shot.vz += ((dz / distance) * aim - shot.vz) * blend;
}

export function parseInput(payload: unknown, current: InputState): InputState | null {
  if (typeof payload !== "object" || !payload) return null;
  const value = payload as Partial<InputState>;
  for (const key of ["pitch", "roll", "yaw", "throttle"] as const) {
    const next = value[key];
    if (next !== undefined && (typeof next !== "number" || !Number.isFinite(next))) return null;
  }
  if (value.gun !== undefined && typeof value.gun !== "boolean") return null;
  if (value.missile !== undefined && typeof value.missile !== "boolean") return null;
  if (value.airbrake !== undefined && typeof value.airbrake !== "boolean") return null;
  if (value.afterburner !== undefined && typeof value.afterburner !== "boolean") return null;
  return {
    pitch: clamp(Number(value.pitch ?? current.pitch), -1, 1),
    roll: clamp(Number(value.roll ?? current.roll), -1, 1),
    yaw: clamp(Number(value.yaw ?? current.yaw), -1, 1),
    throttle: clamp(Number(value.throttle ?? current.throttle), 0, 1),
    gun: Boolean(value.gun ?? current.gun),
    missile: Boolean(value.missile ?? current.missile),
    airbrake: value.airbrake ?? current.airbrake,
    afterburner: value.afterburner ?? current.afterburner,
  };
}
