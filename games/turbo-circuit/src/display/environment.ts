import * as THREE from "three";
import { RX, RZ } from "./math.js";

export function addTrackEnvironment(scene: THREE.Scene) {
  const standMat = new THREE.MeshStandardMaterial({ color: 0x303642, roughness: 0.78 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xb84f43, roughness: 0.7 });
  for (const z of [-64, 64])
    for (const x of [-42, -14, 14, 42]) {
      const stand = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(20, 2.3, 6), standMat);
      base.position.y = 1.15;
      const seats = new THREE.Mesh(new THREE.BoxGeometry(18, 3.8, 3.6), seatMat);
      seats.position.set(0, 3.1, z > 0 ? 1 : -1);
      stand.add(base, seats);
      stand.position.set(x, 0, z);
      scene.add(stand);
    }
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.5, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x765236, roughness: 1 }),
    28,
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.2, 5.2, 7),
    new THREE.MeshStandardMaterial({ color: 0x285c33, roughness: 1 }),
    28,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.08 * Math.sin(i * 1.7);
    const rx = 103 + (i % 3) * 7;
    const rz = 74 + ((i + 1) % 3) * 6;
    dummy.position.set(rx * Math.cos(a), 1.5, rz * Math.sin(a));
    dummy.rotation.set(0, a, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 5.25;
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  scene.add(trunks, crowns);
  const billboardMat = new THREE.MeshStandardMaterial({
    color: 0x172426,
    emissive: 0x245f62,
    emissiveIntensity: 0.7,
    roughness: 0.5,
  });
  for (const [x, z, rotation] of [
    [-92, -24, Math.PI / 2],
    [-92, 24, Math.PI / 2],
    [92, -24, -Math.PI / 2],
    [92, 24, -Math.PI / 2],
  ] as const) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.6), billboardMat);
    sign.position.set(x, 4, z);
    sign.rotation.y = rotation;
    scene.add(sign);
  }
  const cpMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 });
  for (const cp of [
    { x: RX, z: 0 },
    { x: 0, z: RZ },
    { x: -RX, z: 0 },
    { x: 0, z: -RZ },
  ]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.18, 8, 32), cpMat);
    ring.position.set(cp.x, 2.5, cp.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  }
}
