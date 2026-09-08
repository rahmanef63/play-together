import * as THREE from "three";
import { standard } from "./mesh.js";
import { addOceanDetail } from "./oceanDetail.js";
export function addWorld(scene: THREE.Scene) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), standard(0x17668f, 0.15));
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);
  addOceanDetail(scene);
  const island = standard(0x657b3b);
  for (let i = 0; i < 26; i++) {
    const a = i * 1.93,
      r = 70 + (i % 7) * 38,
      h = 7 + (i % 4) * 7,
      m = new THREE.Mesh(new THREE.ConeGeometry(12 + (i % 3) * 7, h, 7), island);
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    m.castShadow = true;
    scene.add(m);
  }
  const cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  for (let i = 0; i < 25; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(7 + (i % 4) * 2, 8, 6), cloud);
    m.scale.set(2, 0.55, 1);
    m.position.set(Math.sin(i * 2.7) * 230, 70 + (i % 5) * 14, Math.cos(i * 1.8) * 230);
    scene.add(m);
  }
}
