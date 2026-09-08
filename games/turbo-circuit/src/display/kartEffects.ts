import * as THREE from "three";
import { mesh } from "./kartPrimitives.js";
export function addExhaust(
  group: THREE.Group,
  d: { length: number },
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  const flames: THREE.Mesh[] = [];
  for (const x of [-0.5, 0.5]) {
    const pipe = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.78, 9), material);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 0.62, -d.length * 0.53);
    group.add(pipe);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.88, 7),
      new THREE.MeshBasicMaterial({ color: 0xff7a18, transparent: true, opacity: 0.9 }),
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.62, -d.length * 0.64);
    flame.visible = false;
    group.add(flame);
    flames.push(flame);
  }
  return flames;
}
export function addDust(group: THREE.Group, d: { width: number; length: number }) {
  const dust: THREE.Mesh[] = [];
  for (const x of [-d.width * 0.52, d.width * 0.52]) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 7, 5),
      new THREE.MeshBasicMaterial({ color: 0xd8d1bb, transparent: true, opacity: 0.42 }),
    );
    puff.position.set(x, 0.3, -d.length * 0.46);
    puff.visible = false;
    group.add(puff);
    dust.push(puff);
  }
  return dust;
}
export function addDriftSparks(group: THREE.Group, d: { width: number; length: number }) {
  const sparks: THREE.Mesh[] = [];
  for (const x of [-d.width * 0.62, d.width * 0.62]) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }),
    );
    spark.position.set(x, 0.38, -d.length * 0.35);
    spark.visible = false;
    group.add(spark);
    sparks.push(spark);
  }
  return sparks;
}
