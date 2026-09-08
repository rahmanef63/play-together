import type * as THREE from "three";

/** Plane local +Y (the arrow tip) follows the course forward vector after laying it flat. */
export function placeRoadMarking(
  mesh: THREE.Mesh,
  pose: { x: number; z: number; heading: number },
  height: number,
) {
  mesh.rotation.set(-Math.PI / 2, 0, pose.heading + Math.PI);
  mesh.position.set(pose.x, height, pose.z);
}
