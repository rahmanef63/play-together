import * as THREE from "three";
import type { ViewFighter } from "./model.js";
export function fighterMesh(color: number) {
  const g = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.15 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.82, 6, 12), mat);
  body.position.y = 1.1;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf4c7a1 }),
  );
  head.position.y = 1.85;
  head.castShadow = true;
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.05, 6, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.83;
  g.add(body, head, band);
  return g;
}
export function pose(mesh: THREE.Group, f: ViewFighter, dt: number) {
  const target = new THREE.Vector3(f.x, f.airborne ? 1.1 : 0.25, f.lane * 0.8);
  mesh.position.lerp(target, Math.min(1, dt * 12));
  mesh.rotation.y = f.side ? Math.PI / 2 : -Math.PI / 2;
  if (f.move) mesh.rotation.z = Math.sin(performance.now() * 0.02) * 0.18;
  else mesh.rotation.z = 0;
  const scale = f.stun ? 1 - 0.04 * Math.sin(performance.now() * 0.06) : 1;
  mesh.scale.setScalar(scale);
}
