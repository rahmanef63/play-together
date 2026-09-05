import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";
import {
  botInput,
  findLock,
  makeBullet,
  makeMissile,
  parseInput,
  steerMissile,
} from "./server/combat.js";
import { clamp, forward, respawnPlane, type State, spawnPlane, wrapAngle } from "./server/model.js";

import { resolveHit } from "./server/projectileCollision.js";

class SkyStrike implements ServerGame {
  readonly #state: State = {
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
      this.#state.planes.push(
        spawnPlane(`bandit-${i + 1}`, `BANDIT ${i + 1}`, true, i + 10, ctx.seed),
      );
  }
  onJoin(player: ServerPlayer) {
    if (this.#state.planes.some((item) => item.id === player.id)) return;
    const count = this.#state.planes.filter((item) => !item.bot).length;
    if (count >= 4) return;
    this.#state.planes.push(spawnPlane(player.id, `PILOT ${count + 1}`, false, count + 1));
  }
  onLeave(id: string) {
    this.#state.planes = this.#state.planes.filter((plane) => plane.bot || plane.id !== id);
    this.#state.shots = this.#state.shots.filter(
      (shot) => shot.ownerId !== id && shot.targetId !== id,
    );
  }
  onInput(id: string, payload: unknown) {
    const plane = this.#state.planes.find((item) => item.id === id && !item.bot);
    if (!plane) return;
    const input = parseInput(payload, plane.input);
    if (input) plane.input = input;
  }
  tick(_now: number, delta: number) {
    if (!Number.isFinite(delta)) return;
    const ms = clamp(delta, 0, 50);
    const dt = ms / 1000;
    if (this.#state.phase === "round-over") {
      this.#state.roundResetMs -= ms;
      if (this.#state.roundResetMs <= 0) this.#resetRound();
      return;
    }
    for (const plane of this.#state.planes) this.#updatePlane(plane, ms, dt);
    for (const shot of this.#state.shots) {
      if (shot.ttl <= 0) continue;
      const from = { x: shot.x, y: shot.y, z: shot.z };
      const shotDt = Math.min(dt, shot.ttl / 1000);
      steerMissile(shot, this.#state.planes, shotDt);
      shot.x += shot.vx * shotDt;
      shot.y += shot.vy * shotDt;
      shot.z += shot.vz * shotDt;
      resolveHit(shot, this.#state.planes, from);
      shot.ttl = Math.max(0, shot.ttl - ms);
    }
    this.#state.shots = this.#state.shots.filter((shot) => shot.ttl > 0);
    const victor = this.#state.planes.find((plane) => plane.kills >= 5);
    if (victor) {
      this.#state.phase = "round-over";
      this.#state.winnerId = victor.id;
      this.#state.roundResetMs = 4000;
    }
  }
  #updatePlane(plane: State["planes"][number], ms: number, dt: number) {
    if (plane.respawnMs > 0) {
      plane.respawnMs -= ms;
      if (plane.respawnMs <= 0)
        respawnPlane(plane, this.#state.planes.indexOf(plane), this.#state.planes.length);
      return;
    }
    if (plane.bot) botInput(plane, this.#state.planes);
    plane.spawnProtectionMs = Math.max(0, plane.spawnProtectionMs - ms);
    plane.gunCd = Math.max(0, plane.gunCd - ms);
    plane.missileCd = Math.max(0, plane.missileCd - ms);
    plane.lockId = findLock(plane, this.#state.planes)?.id ?? null;
    const turn = 0.5 + Math.abs(plane.roll) * 1.1;
    plane.heading = wrapAngle(
      plane.heading - (plane.input.roll * turn + plane.input.yaw * 0.65) * dt,
    );
    plane.pitch = clamp(plane.pitch + plane.input.pitch * 1.05 * dt, -0.72, 0.72);
    plane.roll += (plane.input.roll * 0.95 - plane.roll) * 3.4 * dt;
    plane.afterburnerActive =
      plane.input.afterburner && !plane.input.airbrake && plane.afterburnerFuel > 0.01;
    plane.afterburnerFuel = clamp(
      plane.afterburnerFuel +
        (plane.afterburnerActive ? -0.22 : plane.input.afterburner ? 0 : 0.13) * dt,
      0,
      1,
    );
    const targetSpeed = plane.input.airbrake
      ? 20
      : 24 + plane.input.throttle * 48 + (plane.afterburnerActive ? 32 : 0);
    plane.speed += (targetSpeed - plane.speed) * (plane.input.airbrake ? 3 : 1.7) * dt;
    const facing = forward(plane);
    plane.x += facing.x * plane.speed * dt;
    plane.y = clamp(plane.y + facing.y * plane.speed * dt, 6, 150);
    plane.z += facing.z * plane.speed * dt;
    if (Math.abs(plane.x) > 230) plane.x = -Math.sign(plane.x) * 230;
    if (Math.abs(plane.z) > 230) plane.z = -Math.sign(plane.z) * 230;
    if (plane.input.gun && plane.gunCd <= 0) {
      this.#state.shots.push(makeBullet(plane, ++this.#shotId));
      plane.gunCd = 115;
    }
    if (plane.input.missile && plane.missileCd <= 0 && plane.lockId) {
      this.#state.shots.push(makeMissile(plane, plane.lockId, ++this.#shotId));
      plane.missileCd = 2200;
    }
  }
  #resetRound() {
    this.#state.phase = "dogfight";
    this.#state.round += 1;
    this.#state.winnerId = null;
    for (const plane of this.#state.planes) {
      plane.kills = 0;
      plane.deaths = 0;
      respawnPlane(plane, this.#state.planes.indexOf(plane), this.#state.planes.length);
    }
    this.#state.shots = [];
  }
  snapshot() {
    return structuredClone({
      ...this.#state,
      planes: this.#state.planes.map(({ input, ...plane }) => plane),
    });
  }
}
export const createServerGame: CreateServerGame = (ctx) => new SkyStrike(ctx);
