import type * as THREE from "three";
import type { Racer } from "./model.js";

export function applyCameraJuice(racer: Racer, camera: THREE.PerspectiveCamera, now: number) {
  const speedRatio = clamp(Math.abs(racer.speed) / 45, 0, 1.4),
    boosting = racer.boostTimer > 0,
    spinning = racer.spinTimer > 0,
    shake = spinning ? 0.16 : boosting ? 0.12 : speedRatio > 0.9 ? 0.024 : 0,
    extraFov = (boosting ? 8 : 0) + Math.max(0, speedRatio - 0.88) * 8;
  if (shake > 0) {
    camera.position.x += Math.sin(now * 0.081) * shake;
    camera.position.y += Math.cos(now * 0.067) * shake * 0.65;
    camera.position.z += Math.sin(now * 0.053 + 1.7) * shake * 0.55;
  }
  if (extraFov > 0) {
    camera.fov = clamp(camera.fov + extraFov, 45, 92);
    camera.updateProjectionMatrix();
  }
}
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
