import type { Plane, Shot } from "./model.js";

type Position = { x: number; y: number; z: number };

/** Earliest segment/sphere intersection, preventing fast projectiles tunneling. */
export function segmentHitFraction(
  from: Position,
  to: Position,
  target: Position,
  radius: number,
): number | null {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    dz = to.z - from.z;
  const mx = from.x - target.x,
    my = from.y - target.y,
    mz = from.z - target.z;
  const c = mx * mx + my * my + mz * mz - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy + dz * dz;
  if (a <= Number.EPSILON) return null;
  const b = 2 * (mx * dx + my * dy + mz * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function resolveHit(shot: Shot, planes: Plane[], from: Position): void {
  if (shot.ttl <= 0) return;
  let hit: Plane | undefined;
  let nearest = Infinity;
  for (const target of planes) {
    if (target.id === shot.ownerId || target.respawnMs > 0 || target.spawnProtectionMs > 0)
      continue;
    const fraction = segmentHitFraction(from, shot, target, shot.kind === "missile" ? 5 : 2.5);
    if (fraction !== null && fraction < nearest) {
      nearest = fraction;
      hit = target;
    }
  }
  if (!hit) return;
  hit.hp = Math.max(0, hit.hp - (shot.kind === "missile" ? 48 : 11));
  shot.ttl = 0;
  if (hit.hp === 0) {
    hit.deaths += 1;
    hit.respawnMs = 2500;
    const owner = planes.find((plane) => plane.id === shot.ownerId);
    if (owner) owner.kills += 1;
  }
}
