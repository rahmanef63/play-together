import * as THREE from "three";
import type { SkyState } from "./model.js";
import { smoothing } from "./model.js";

export function createProjectile(kind: "bullet" | "missile") {
  const group = new THREE.Group(),
    color = kind === "missile" ? 0xff5630 : 0xfff38a;
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(kind === "missile" ? 0.28 : 0.1, 8, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(kind === "missile" ? 0.16 : 0.06, kind === "missile" ? 1.4 : 0.65, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb000, transparent: true, opacity: 0.72 }),
  );
  trail.name = "trail";
  trail.position.z = -0.6;
  trail.rotation.x = Math.PI / 2;
  group.add(body, trail);
  return group;
}

export function updateShots(
  state: SkyState,
  meshes: Map<number, THREE.Group>,
  poses: Map<number, THREE.Vector3>,
  dt: number,
) {
  const alpha = smoothing(18, dt);
  for (const shot of state.shots) {
    const mesh = meshes.get(shot.id),
      pose = poses.get(shot.id);
    if (!mesh || !pose) continue;
    pose.lerp(new THREE.Vector3(shot.x, shot.y, shot.z), alpha);
    mesh.position.copy(pose);
    mesh.rotation.x += dt * 14;
    const trail = mesh.getObjectByName("trail");
    if (trail) trail.scale.z = 0.7 + Math.sin(performance.now() * 0.03 + shot.id) * 0.25;
  }
}
