import { clamp, type Rider, type RiderInput } from "./model.js";

const SPRINT_WINDOW_MAX = 700;

export function registerPedalEdge(rider: Rider, nextPedal: boolean, now: number): void {
  if (!nextPedal || rider.input.pedal) return;
  const gap = now - rider.pedalTappedAt;
  if (gap >= 0 && gap <= SPRINT_WINDOW_MAX && rider.stamina > 8) rider.sprintMs = 1250;
  rider.pedalTappedAt = now;
}

export function registerJumpEdge(rider: Rider, next: RiderInput): void {
  if (!next.jump || rider.input.jump || rider.crashed > 0 || rider.finishedAt !== null) return;
  if (rider.grounded) {
    if (rider.jumpReady && rider.speed > 7) rider.jumpQueued = true;
    return;
  }
  if (rider.combo >= 3) return;
  rider.currentTrick = trickName(next.steer, next.body);
  rider.combo += 1;
  rider.pendingStyle += trickValue(next.steer, next.body) * rider.combo;
}

export function registerAttackEdge(rider: Rider, next: RiderInput, rivals: Rider[]): void {
  if (
    !next.attack ||
    rider.input.attack ||
    next.body < -0.8 ||
    rider.attackCooldown > 0 ||
    rider.crashed > 0 ||
    rider.finishedAt !== null
  )
    return;
  const selectedSide = Math.abs(next.steer) > 0.25 ? -Math.sign(next.steer) : 0;
  const rival = rivals
    .filter((other) => other !== rider && other.crashed <= 0 && other.finishedAt === null)
    .filter(
      (other) =>
        Math.abs(other.progress - rider.progress) < 4.5 && Math.abs(other.lane - rider.lane) < 2.8,
    )
    .filter((other) => selectedSide === 0 || Math.sign(other.lane - rider.lane) === selectedSide)
    .sort(
      (a, b) =>
        Math.abs(a.progress - rider.progress) +
        Math.abs(a.lane - rider.lane) -
        (Math.abs(b.progress - rider.progress) + Math.abs(b.lane - rider.lane)),
    )[0];
  rider.attackCooldown = 760;
  if (!rival) return;
  const push = Math.sign(rival.lane - rider.lane || selectedSide || 1);
  rival.lateralVelocity += push * 3.4;
  rival.speed = Math.max(0, rival.speed - 2.4);
  rival.hitFeedback = 520;
  rider.hitFeedback = 320;
  rider.score += 50;
  rider.stamina = clamp(rider.stamina + 4, 0, 100);
}

export function updateContext(rider: Rider, _now: number, dt: number): void {
  rider.sprintMs =
    rider.input.pedal && rider.stamina > 0 ? Math.max(0, rider.sprintMs - dt * 1000) : 0;
  rider.sprinting = rider.sprintMs > 0 && rider.input.pedal && rider.stamina > 0;
  rider.rearView = rider.input.attack && rider.input.body < -0.8;
  rider.powerslide =
    rider.input.brake &&
    Math.abs(rider.input.steer) > 0.58 &&
    rider.speed > 7.5 &&
    rider.input.body < 0.55;
  rider.frontBrake = rider.input.brake && rider.input.body > 0.45;
  rider.hitFeedback = Math.max(0, rider.hitFeedback - dt * 1000);
  rider.attackCooldown = Math.max(0, rider.attackCooldown - dt * 1000);
}

export function resolveLanding(rider: Rider, landed: boolean, crashed: boolean): void {
  if (!landed && !crashed) return;
  if (crashed) {
    rider.pendingStyle = 0;
    rider.combo = 0;
  } else if (rider.pendingStyle) {
    rider.score += rider.pendingStyle;
    rider.pendingStyle = 0;
    rider.combo = 0;
  }
  rider.currentTrick = "";
}

export function brakeForce(rider: Rider, grip: number): number {
  if (!rider.input.brake) return 0;
  if (rider.frontBrake) return 22 * grip;
  if (rider.powerslide) return 10.5 * grip;
  if (rider.input.body < -0.45) return 13 * grip;
  return 16.5 * grip;
}

export function pedalForce(rider: Rider, room: number, effort: number): number {
  return rider.input.pedal && !rider.input.brake
    ? (rider.sprinting ? 9.2 : 5.2) * effort * room
    : 0;
}

function trickName(steer: number, body: number): string {
  if (body > 0.6) return "FRONT ARC";
  if (body < -0.6) return "BACK ARC";
  if (steer > 0.55) return "RIGHT SPIN";
  if (steer < -0.55) return "LEFT SPIN";
  return "TABLE STYLE";
}

function trickValue(steer: number, body: number): number {
  return 70 + Math.round(Math.abs(steer) * 25 + Math.abs(body) * 25);
}
