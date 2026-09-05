import * as THREE from "three";

export function createBike(color: number): THREE.Group {
  const root = new THREE.Group();
  root.name = "bike-rider";
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.8 });
  const riderMat = new THREE.MeshStandardMaterial({ color: 0xf0d4bc, roughness: 0.86 });
  for (const z of [-0.78, 0.78]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 8, 18), dark);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.43, z);
    root.add(wheel);
  }
  root.add(tube(new THREE.Vector3(0, 0.46, -0.65), new THREE.Vector3(0, 0.72, 0.02), 0.075, paint));
  root.add(tube(new THREE.Vector3(0, 0.72, 0.02), new THREE.Vector3(0, 0.46, 0.66), 0.075, paint));
  root.add(tube(new THREE.Vector3(0, 0.46, -0.65), new THREE.Vector3(0, 0.46, 0.66), 0.055, paint));
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.72, 10), paint);
  torso.position.set(0, 1.15, 0.04);
  torso.rotation.x = 0.48;
  root.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), riderMat);
  head.position.set(0, 1.56, 0.3);
  root.add(head);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
    paint,
  );
  helmet.position.copy(head.position);
  helmet.position.y += 0.05;
  root.add(helmet);
  return root;
}

function tube(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.MeshStandardMaterial,
) {
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
    material,
  );
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}
