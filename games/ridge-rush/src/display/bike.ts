import * as THREE from "three";

export function createBike(color: number): THREE.Group {
  const root = new THREE.Group();
  root.name = "bike-rider";
  const bike = new THREE.Group();
  bike.name = "bike-frame";
  root.add(bike);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.46, metalness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x111820,
    roughness: 0.72,
    metalness: 0.18,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe6b995, roughness: 0.82 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x202a36, roughness: 0.9 });

  for (const [name, z] of [
    ["rear-wheel", -0.78],
    ["front-wheel", 0.78],
  ] as const) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.062, 10, 24), dark);
    wheel.name = name;
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.43, z);
    wheel.castShadow = true;
    root.add(wheel);
  }
  bike.add(
    tube(new THREE.Vector3(0, 0.46, -0.65), new THREE.Vector3(0, 0.76, 0.02), 0.07, paint),
    tube(new THREE.Vector3(0, 0.76, 0.02), new THREE.Vector3(0, 0.46, 0.66), 0.07, paint),
    tube(new THREE.Vector3(0, 0.46, -0.65), new THREE.Vector3(0, 0.46, 0.66), 0.052, paint),
  );
  const fork = tube(new THREE.Vector3(0, 0.5, 0.66), new THREE.Vector3(0, 0.95, 0.6), 0.045, dark);
  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), dark);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.0, 0.58);
  bike.add(fork, handlebar);
  const crank = new THREE.Group();
  crank.name = "crank";
  crank.position.set(0, 0.6, -0.02);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 10), dark);
  axle.rotation.z = Math.PI / 2;
  crank.add(axle);
  bike.add(crank);

  const rider = new THREE.Group();
  rider.name = "rider-body";
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.54, 6, 10), paint);
  torso.position.set(0, 1.22, 0.1);
  torso.rotation.x = 0.5;
  torso.castShadow = true;
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), fabric);
  hips.position.set(0, 0.91, -0.08);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), skin);
  head.position.set(0, 1.62, 0.34);
  head.castShadow = true;
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 14, 7, 0, Math.PI * 2, 0, Math.PI * 0.56),
    paint,
  );
  helmet.position.set(0, 1.68, 0.34);
  helmet.castShadow = true;
  rider.add(torso, hips, head, helmet);
  rider.add(
    limb("left-leg", -0.12, 0.9, -0.07, 0.52, fabric),
    limb("right-leg", 0.12, 0.9, -0.07, 0.52, fabric),
  );
  rider.add(
    limb("left-arm", -0.23, 1.38, 0.18, 0.44, skin),
    limb("right-arm", 0.23, 1.38, 0.18, 0.44, skin),
  );
  bike.add(rider);
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = true;
  });
  return root;
}

function limb(
  name: string,
  x: number,
  y: number,
  z: number,
  length: number,
  material: THREE.Material,
) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, length, 8), material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 9),
    material,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}
