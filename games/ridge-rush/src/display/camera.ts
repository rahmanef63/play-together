import type { ControllerMode } from "@play-together/contracts";
import * as THREE from "three";
import { centerLine, courseElevation, courseHeading, courseSlope } from "../shared/course.js";
import {
  type RiderPose,
  type RiderView,
  type RidgeViewState,
  smoothAngle,
  smoothing,
} from "./model.js";
import type { RidgeScene } from "./scene.js";

export function updateRiderMeshes(
  state: RidgeViewState,
  meshes: Map<string, THREE.Group>,
  poses: Map<string, RiderPose>,
  dt: number,
): void {
  const alpha = smoothing(13, dt);
  for (const rider of state.riders) {
    const mesh = meshes.get(rider.id);
    const pose = poses.get(rider.id);
    if (!mesh || !pose) continue;
    const x = centerLine(rider.progress) + rider.lane;
    const y = courseElevation(rider.progress) + 0.08;
    const z = rider.progress;
    const heading = courseHeading(rider.progress);
    const air = airHeight(rider);
    const teleported = Math.hypot(x - pose.x, y - pose.y, z - pose.z) > 28;
    pose.x = teleported ? x : THREE.MathUtils.lerp(pose.x, x, alpha);
    pose.y = teleported ? y : THREE.MathUtils.lerp(pose.y, y, alpha);
    pose.z = teleported ? z : THREE.MathUtils.lerp(pose.z, z, alpha);
    pose.heading = teleported ? heading : smoothAngle(pose.heading, heading, alpha);
    pose.lean = THREE.MathUtils.lerp(pose.lean, rider.lean, alpha);
    pose.air = THREE.MathUtils.lerp(pose.air, air, alpha);
    mesh.visible = rider.crashed <= 0;
    mesh.position.set(pose.x, pose.y + pose.air, pose.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = pose.heading;
    mesh.rotation.x = Math.atan2(-courseSlope(rider.progress), 1);
    mesh.rotation.z = -pose.lean * 0.32;
    animateWheels(mesh, rider.speed, dt);
  }
}

export function updateCamera(
  view: RidgeScene,
  state: RidgeViewState,
  playerId: string,
  mode: ControllerMode,
  poses: Map<string, RiderPose>,
  target: THREE.Vector3,
  ready: boolean,
  dt: number,
): boolean {
  const me = state.riders.find((rider) => rider.id === playerId && !rider.bot);
  const focus = mode === "handheld" ? (me ?? state.riders[0]) : sharedFocus(state);
  if (!focus) return ready;
  const pose = poses.get(focus.id);
  if (!pose) return ready;
  const forward = new THREE.Vector3(Math.sin(pose.heading), 0, Math.cos(pose.heading));
  const rear = mode === "handheld" && focus.rearView;
  const distance = mode === "handheld" ? (rear ? 9 : 12) : 18;
  const height = mode === "handheld" ? 6.2 : 9.5;
  const direction = rear ? 1 : -1;
  const desired = new THREE.Vector3(pose.x, pose.y + pose.air + height, pose.z).addScaledVector(
    forward,
    distance * direction,
  );
  const lookAhead = rear ? -9 : mode === "handheld" ? 15 : 20;
  target.set(pose.x, pose.y + 1.4, pose.z).addScaledVector(forward, lookAhead);
  if (!ready) view.camera.position.copy(desired);
  else view.camera.position.lerp(desired, smoothing(mode === "handheld" ? 10 : 7, dt));
  view.camera.lookAt(target);
  view.camera.fov = mode === "handheld" ? 62 : 68;
  view.camera.updateProjectionMatrix();
  return true;
}

export function createPose(rider: RiderView): RiderPose {
  return {
    x: centerLine(rider.progress) + rider.lane,
    y: courseElevation(rider.progress),
    z: rider.progress,
    heading: courseHeading(rider.progress),
    lean: rider.lean,
    air: airHeight(rider),
  };
}

function sharedFocus(state: RidgeViewState): RiderView | undefined {
  return state.riders.find((rider) => !rider.bot && rider.finishedAt === null) ?? state.riders[0];
}

function airHeight(rider: RiderView): number {
  if (rider.airborne <= 0 || rider.airTotal <= 0) return 0;
  const phase = Math.max(0, Math.min(1, 1 - rider.airborne / rider.airTotal));
  return Math.sin(phase * Math.PI) * Math.min(2.6, 0.9 + rider.airTotal * 2.1);
}

function animateWheels(root: THREE.Group, speed: number, dt: number): void {
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.TorusGeometry))
      continue;
    child.rotation.z -= (speed * dt) / 0.42;
  }
}
