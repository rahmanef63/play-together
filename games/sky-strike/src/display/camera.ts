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
  view.top.textContent = `SKY STRIKE · ROUND ${state.round} · KILLS ${me.kills} · HP ${Math.round(me.hp)}%`;
  view.center.innerHTML = lock
    ? `<div style="width:58px;height:58px;border:3px solid #ff4747;border-radius:50%;display:grid;place-items:center">LOCK</div>`
    : `<div style="width:42px;height:42px;border:2px solid #fff8;border-radius:50%"></div>`;
  view.bottom.innerHTML = `<strong>${Math.round(me.speed * 3.6)} km/h</strong><strong>ALT ${Math.round(me.y)} m</strong>`;
  return ready;
}
