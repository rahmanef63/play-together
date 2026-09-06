import type { ControllerMode } from "@play-together/contracts";
import * as THREE from "three";
import {
  centerLine,
  clampProgress,
  courseElevation,
  courseHeading,
  courseSlope,
} from "../shared/course.js";
import { corridorCamera } from "./camera-clearance.js";
import {
  type RiderPose,
  type RiderView,
  type RidgeViewState,
  smoothAngle,
  smoothing,
} from "./model.js";
import { animateRider } from "./riderAnimation.js";
import type { RidgeScene } from "./scene.js";
export function updateRiderMeshes(
  state: RidgeViewState,
  meshes: Map<string, THREE.Group>,
  poses: Map<string, RiderPose>,
  dt: number,
): void {
  const alpha = smoothing(13, dt);
  for (const rider of state.riders) {
    const mesh = meshes.get(rider.id),
      pose = poses.get(rider.id);
    if (!mesh || !pose) continue;
    const x = centerLine(rider.progress) + rider.lane,
      y = rider.altitude,
      z = rider.progress,
      heading = courseHeading(rider.progress),
      teleported = Math.hypot(x - pose.x, y - pose.y, z - pose.z) > 60;
    pose.x = teleported ? x : THREE.MathUtils.lerp(pose.x, x, alpha);
    pose.y = teleported ? y : THREE.MathUtils.lerp(pose.y, y, alpha);
    pose.z = teleported ? z : THREE.MathUtils.lerp(pose.z, z, alpha);
    pose.heading = teleported ? heading : smoothAngle(pose.heading, heading, alpha);
    pose.lean = THREE.MathUtils.lerp(pose.lean, rider.lean, alpha);
    pose.pitch = THREE.MathUtils.lerp(pose.pitch, rider.pitch, alpha);
    pose.suspensionFront = THREE.MathUtils.lerp(pose.suspensionFront, rider.suspensionFront, alpha);
    pose.suspensionRear = THREE.MathUtils.lerp(pose.suspensionRear, rider.suspensionRear, alpha);
    mesh.visible = rider.crashed <= 0;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = pose.heading;
    mesh.rotation.x = -pose.pitch;
    mesh.rotation.z = -pose.lean * 0.38;
    if (rider.hitFeedback > 0) mesh.rotation.z += Math.sin(performance.now() * 0.05) * 0.12;
    animateRider(mesh, rider, pose.suspensionFront, pose.suspensionRear, dt);
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
  const speed = focus.speed;
  const steep = Math.max(0, -courseSlope(focus.progress));
  const distance =
    mode === "handheld"
      ? rear
        ? 8
        : 5.5 + Math.min(2, speed * 0.05)
      : 12 + Math.min(4, speed * 0.08);
  const height = mode === "handheld" ? 2.1 : 5.2;
  const forward = new THREE.Vector3(Math.sin(pose.heading), 0, Math.cos(pose.heading));
  // Keep the camera in the course corridor; tangent offsets can enter cliff walls on switchbacks.
  const plan = corridorCamera(focus.progress, focus.lane, pose.y, distance, rear, height);
  const desired = new THREE.Vector3(plan.x, plan.y, plan.progress);

  const lookDistance = rear ? -5 : mode === "handheld" ? 2.8 : 24 + speed * 0.25;
  target.copy(
    new THREE.Vector3(pose.x, pose.y + (mode === "handheld" ? 0.72 : 1.1), pose.z).addScaledVector(
      forward,
      lookDistance,
    ),
  );
  if (mode !== "handheld" && !rear) {
    const lookProgress = clampProgress(focus.progress + lookDistance);
    target.y = Math.min(target.y, courseElevation(lookProgress) + 1.2) - Math.min(6, steep * 6);
  }

  if (!ready) view.camera.position.copy(desired);
  else view.camera.position.lerp(desired, smoothing(mode === "handheld" ? 11 : 7, dt));
  view.camera.lookAt(target);
  view.camera.rotation.z = THREE.MathUtils.lerp(
    view.camera.rotation.z,
    -focus.lean * 0.04,
    smoothing(6, dt),
  );
  view.camera.fov =
    (mode === "handheld" ? 54 : 64) + Math.min(12, speed * 0.22) + Math.min(4, steep * 5);
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
    pitch: rider.pitch,
    suspensionFront: rider.suspensionFront,
    suspensionRear: rider.suspensionRear,
  };
}
function sharedFocus(state: RidgeViewState): RiderView | undefined {
  return state.riders.find((r) => !r.bot && r.finishedAt === null) ?? state.riders[0];
}
