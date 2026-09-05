import type { ControllerMode } from "@play-together/contracts";
import * as THREE from "three";
import {
  centerLine,
  clampProgress,
  courseElevation,
  courseHeading,
  courseSlope,
} from "../shared/course.js";
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
    const y = rider.altitude;
    const z = rider.progress;
    const heading = courseHeading(rider.progress);
    const pitch = rider.grounded
      ? Math.atan2(-courseSlope(rider.progress), 1)
      : Math.atan2(-rider.verticalSpeed, Math.max(4, rider.speed));
    const teleported = Math.hypot(x - pose.x, y - pose.y, z - pose.z) > 28;
    pose.x = teleported ? x : THREE.MathUtils.lerp(pose.x, x, alpha);
    pose.y = teleported ? y : THREE.MathUtils.lerp(pose.y, y, alpha);
    pose.z = teleported ? z : THREE.MathUtils.lerp(pose.z, z, alpha);
    pose.heading = teleported ? heading : smoothAngle(pose.heading, heading, alpha);
    pose.lean = THREE.MathUtils.lerp(pose.lean, rider.lean, alpha);
    pose.pitch = THREE.MathUtils.lerp(pose.pitch, pitch, alpha);
    mesh.visible = rider.crashed <= 0;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = pose.heading;
    mesh.rotation.x = pose.pitch;
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
  const rear = mode === "handheld" && focus.rearView;
  const distance = mode === "handheld" ? (rear ? 9 : 13) : 19;
  const height = mode === "handheld" ? 5.8 : 8.6;
  const cameraProgress = clampProgress(focus.progress + (rear ? distance : -distance));
  const cameraX = centerLine(cameraProgress) + focus.lane * 0.7;
  const cameraY = Math.max(courseElevation(cameraProgress) + height, pose.y + height * 0.78);
  const desired = new THREE.Vector3(cameraX, cameraY, cameraProgress);
  const lookDistance = rear ? -11 : mode === "handheld" ? 24 : 32;
  const lookProgress = clampProgress(focus.progress + lookDistance);
  target.set(
    centerLine(lookProgress) + focus.lane * 0.35,
    courseElevation(lookProgress) + 1.2,
    lookProgress,
  );
  if (!ready) view.camera.position.copy(desired);
  else view.camera.position.lerp(desired, smoothing(mode === "handheld" ? 10 : 7, dt));
  view.camera.lookAt(target);
  view.camera.fov = mode === "handheld" ? 64 : 70;
  view.camera.updateProjectionMatrix();
  return true;
}

export function createPose(rider: RiderView): RiderPose {
  return {
    x: centerLine(rider.progress) + rider.lane,
    y: rider.altitude,
    z: rider.progress,
    heading: courseHeading(rider.progress),
    lean: rider.lean,
    pitch: rider.grounded
      ? Math.atan2(-courseSlope(rider.progress), 1)
      : Math.atan2(-rider.verticalSpeed, Math.max(4, rider.speed)),
  };
}

function sharedFocus(state: RidgeViewState): RiderView | undefined {
  return state.riders.find((rider) => !rider.bot && rider.finishedAt === null) ?? state.riders[0];
}

function animateWheels(root: THREE.Group, speed: number, dt: number): void {
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.TorusGeometry))
      continue;
    child.rotation.z -= (speed * dt) / 0.42;
  }
}
