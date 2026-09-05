import * as THREE from "three";
import type { PlanePose, SkyState } from "./model.js";
import { smoothing } from "./model.js";
import type { SkyScene } from "./scene.js";

export function updateSkyCameraAndHud(
  view: SkyScene,
  state: SkyState,
  me: SkyState["planes"][number],
  pose: PlanePose,
  target: THREE.Vector3,
  ready: boolean,
  dt: number,
  mode: "remote" | "handheld",
): boolean {
  const facing = {
    x: Math.sin(pose.heading) * Math.cos(pose.pitch),
    y: Math.sin(pose.pitch),
    z: Math.cos(pose.heading) * Math.cos(pose.pitch),
  };
  const right = { x: -Math.cos(pose.heading), z: Math.sin(pose.heading) };
  const chase = mode === "handheld" ? 13 : 19;
  const desiredCamera = new THREE.Vector3(
    pose.x - facing.x * chase + right.x * pose.roll * 2,
    pose.y + 5 - facing.y * 5,
    pose.z - facing.z * chase + right.z * pose.roll * 2,
  );
  const desiredTarget = new THREE.Vector3(
    pose.x + facing.x * 12,
    pose.y + facing.y * 10,
    pose.z + facing.z * 12,
  );
  if (!ready) {
    view.camera.position.copy(desiredCamera);
    target.copy(desiredTarget);
    ready = true;
  } else {
    view.camera.position.lerp(desiredCamera, smoothing(8, dt));
    target.lerp(desiredTarget, smoothing(11, dt));
  }
  view.camera.lookAt(target);
  const lock = state.planes.find((plane) => plane.id === me.lockId);
  const winner = state.planes.find((plane) => plane.id === state.winnerId);
  view.top.textContent =
    state.phase === "round-over"
      ? `${winner?.name ?? "PILOT"} WINS · NEXT ROUND IN ${Math.ceil(state.roundResetMs / 1000)}`
      : me.respawnMs > 0
        ? `AIRCRAFT DOWN · RESPAWN IN ${Math.ceil(me.respawnMs / 1000)}`
        : `SKY STRIKE · ROUND ${state.round} · KILLS ${me.kills} · HP ${Math.round(me.hp)}%${me.spawnProtectionMs > 0 ? " · SHIELD" : ""}`;
  view.center.innerHTML = lock
    ? `<div style="width:58px;height:58px;border:3px solid #ff4747;border-radius:50%;display:grid;place-items:center">LOCK</div>`
    : `<div style="width:42px;height:42px;border:2px solid #fff8;border-radius:50%"></div>`;
  view.bottom.innerHTML = `<strong>${Math.round(me.speed * 3.6)} km/h</strong><strong>${me.afterburnerActive ? "BOOST" : "FUEL"} ${Math.round(me.afterburnerFuel * 100)}% · ${me.missileCd > 0 ? `MISSILE ${(me.missileCd / 1000).toFixed(1)}s` : "MISSILE READY"}</strong><strong>ALT ${Math.round(me.y)} m</strong>`;
  return ready;
}
