import type { ControllerMode } from "@play-together/contracts";
import * as THREE from "three";
import { clamp, smoothing } from "./math.js";
import type { Racer, RacerPose } from "./model.js";
export interface CameraState {
  target: THREE.Vector3;
  ready: boolean;
}
export function updateCameraView(
  me: Racer,
  pose: RacerPose,
  camera: THREE.PerspectiveCamera,
  state: CameraState,
  dt: number,
  mode: ControllerMode,
) {
  if (me.rearView) return rear(pose, camera, state, dt);
  if (me.cameraMode === "wide") return wide(me, pose, camera, state, dt);
  if (me.cameraMode === "driver") return driver(me, pose, camera, state, dt);
  if (me.cameraMode === "bumper") return bumper(me, pose, camera, state, dt);
  chase(me, pose, camera, state, dt, mode);
}
function chase(
  me: Racer,
  p: RacerPose,
  c: THREE.PerspectiveCamera,
  s: CameraState,
  dt: number,
  mode: ControllerMode,
) {
  const speed = Math.abs(me.speed),
    back = mode === "handheld" ? 10 + Math.min(5, speed * 0.08) : 15,
    look = clamp(4 + speed * 0.12, 4, 9.5);
  place(
    c,
    s,
    new THREE.Vector3(
      p.x - Math.sin(p.heading) * back,
      mode === "handheld" ? 5.6 : 8.2,
      p.z - Math.cos(p.heading) * back,
    ),
    new THREE.Vector3(p.x + Math.sin(p.heading) * look, 1, p.z + Math.cos(p.heading) * look),
    58 + clamp(speed / 45, 0, 1) * 8,
    dt,
    mode === "handheld" ? 10 : 7,
  );
}
function wide(me: Racer, p: RacerPose, c: THREE.PerspectiveCamera, s: CameraState, dt: number) {
  const back = 23 + clamp(me.speed / 4, 0, 6);
  place(
    c,
    s,
    new THREE.Vector3(p.x - Math.sin(p.heading) * back, 13, p.z - Math.cos(p.heading) * back),
    new THREE.Vector3(p.x + Math.sin(p.heading) * 7, 0.8, p.z + Math.cos(p.heading) * 7),
    66,
    dt,
    5,
  );
}
function driver(me: Racer, p: RacerPose, c: THREE.PerspectiveCamera, s: CameraState, dt: number) {
  const fx = Math.sin(p.heading),
    fz = Math.cos(p.heading);
  place(
    c,
    s,
    new THREE.Vector3(p.x + fx * 0.7, 1.55, p.z + fz * 0.7),
    new THREE.Vector3(p.x + fx * 18, 1.3, p.z + fz * 18),
    70 + clamp(me.speed / 45, 0, 1) * 6,
    dt,
    17,
  );
}
function bumper(me: Racer, p: RacerPose, c: THREE.PerspectiveCamera, s: CameraState, dt: number) {
  const fx = Math.sin(p.heading),
    fz = Math.cos(p.heading);
  place(
    c,
    s,
    new THREE.Vector3(p.x + fx * 1.9, 0.72, p.z + fz * 1.9),
    new THREE.Vector3(p.x + fx * 22, 0.5, p.z + fz * 22),
    76 + clamp(me.speed / 45, 0, 1) * 7,
    dt,
    19,
  );
}
function rear(p: RacerPose, c: THREE.PerspectiveCamera, s: CameraState, dt: number) {
  const fx = Math.sin(p.heading),
    fz = Math.cos(p.heading);
  place(
    c,
    s,
    new THREE.Vector3(p.x - fx * 0.4, 1.5, p.z - fz * 0.4),
    new THREE.Vector3(p.x - fx * 18, 1.2, p.z - fz * 18),
    68,
    dt,
    19,
  );
}
function place(
  c: THREE.PerspectiveCamera,
  s: CameraState,
  position: THREE.Vector3,
  target: THREE.Vector3,
  fov: number,
  dt: number,
  rate: number,
) {
  const alpha = s.ready ? smoothing(rate, dt) : 1;
  c.fov = THREE.MathUtils.lerp(c.fov, fov, smoothing(6, dt));
  c.updateProjectionMatrix();
  c.position.lerp(position, alpha);
  s.target.lerp(target, s.ready ? smoothing(rate + 2, dt) : 1);
  c.lookAt(s.target);
  s.ready = true;
}
