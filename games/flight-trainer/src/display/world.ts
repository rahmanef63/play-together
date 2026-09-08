import * as THREE from "three";
import { CHECKPOINTS, RUNWAY } from "../shared/course.js";
import { addAirfield } from "./airfield.js";

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
export function addFlightWorld(scene: THREE.Scene): THREE.Mesh[] {
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), mat(0x567a35));
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(RUNWAY.width, RUNWAY.zMax - RUNWAY.zMin),
    mat(0x30343b),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(RUNWAY.x, 0.02, (RUNWAY.zMax + RUNWAY.zMin) / 2);
  runway.receiveShadow = true;
  scene.add(runway);
  addAirfield(scene);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = -166; z < -50; z += 12) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), white);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.04, z);
    scene.add(m);
  }
  const rock = mat(0x53633d);
  for (let i = 0; i < 42; i++) {
    const a = i * 1.91,
      r = 150 + (i % 8) * 28,
      h = 25 + (i % 7) * 11,
      m = new THREE.Mesh(new THREE.ConeGeometry(14 + (i % 5) * 5, h, 7), rock);
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - 15);
    m.castShadow = true;
    scene.add(m);
  }
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.62,
  });
  return CHECKPOINTS.map((p) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(8, 0.45, 10, 40), ringMaterial.clone());
    r.position.set(p.x, p.y, p.z);
    scene.add(r);
    return r;
  });
}
