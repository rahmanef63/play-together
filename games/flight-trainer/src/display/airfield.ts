import * as THREE from "three";
import { RUNWAY } from "../shared/course.js";
export function addAirfield(scene: THREE.Scene) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x879089, roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc6c6b7, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263746, roughness: 0.75 });
  const light = new THREE.MeshBasicMaterial({ color: 0xd9f4ff });
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(g, m);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    scene.add(object);
    return object;
  };
  const apron = mesh(new THREE.PlaneGeometry(62, 72), concrete, RUNWAY.x + 40, 0.025, -113);
  apron.rotation.x = -Math.PI / 2;
  for (const z of [-138, -110, -82]) {
    mesh(new THREE.BoxGeometry(20, 8, 21), metal, 65, 4, z);
    mesh(new THREE.BoxGeometry(0.1, 6, 17), dark, 54.9, 3, z);
    const roof = mesh(new THREE.CylinderGeometry(0, 14, 5, 4), dark, 65, 9, z);
    roof.rotation.y = Math.PI / 4;
  }
  mesh(new THREE.CylinderGeometry(2.6, 3.4, 12, 8), concrete, -34, 6, -125);
  mesh(new THREE.CylinderGeometry(5, 3.8, 3.8, 8), dark, -34, 13, -125);
  mesh(new THREE.ConeGeometry(6, 1.2, 8), metal, -34, 15.5, -125);
  for (let z = RUNWAY.zMin + 5; z < RUNWAY.zMax; z += 10)
    for (const side of [-1, 1])
      mesh(
        new THREE.SphereGeometry(0.24, 6, 4),
        light,
        RUNWAY.x + side * (RUNWAY.width / 2 + 0.8),
        0.25,
        z,
      );
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const stripe = mesh(
        new THREE.PlaneGeometry(1, 7),
        light,
        RUNWAY.x + side * (2 + i * 1.5),
        0.04,
        RUNWAY.zMin + 9,
      );
      stripe.rotation.x = -Math.PI / 2;
    }
}
