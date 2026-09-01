import * as THREE from "three";
import type { CircuitSpec } from "../shared/catalog.js";
import { sampleCircuit } from "../shared/catalog.js";

export function addCircuitEnvironment(group: THREE.Group, circuit: CircuitSpec) {
  if (circuit.id === "monza") addAlpine(group, circuit);
  else if (circuit.id === "interlagos") addSunset(group);
  else addSepang(group);
}

function addSunset(group: THREE.Group) {
  const standMat = new THREE.MeshStandardMaterial({ color: 0x3a3032, roughness: 0.8 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xcf604b, roughness: 0.72 });
  for (const z of [-62, 62])
    for (const x of [-38, 0, 38]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 7), standMat);
      const seats = new THREE.Mesh(new THREE.BoxGeometry(23, 4.5, 4), seatMat);
      base.position.set(x, 1.5, z);
      seats.position.set(x, 4.2, z + (z > 0 ? -1.2 : 1.2));
      group.add(base, seats);
    }
  for (const x of [-88, 88]) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(16, 6, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0x20222a,
        emissive: 0xe45f45,
        emissiveIntensity: 0.55,
      }),
    );
    sign.position.set(x, 5, 0);
    sign.rotation.y = Math.PI / 2;
    group.add(sign);
  }
}

function addSepang(group: THREE.Group) {
  const colors = [0xc84e42, 0x34748a, 0xd49b3b, 0x55606e];
  for (let i = 0; i < 18; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4.2, 4),
      new THREE.MeshStandardMaterial({
        color: colors[i % colors.length] ?? 0x55606e,
        roughness: 0.75,
      }),
    );
    const side = i % 2 === 0 ? -1 : 1;
    box.position.set(side * (90 + (i % 3) * 6), 2.1 + (i % 4 === 0 ? 4.2 : 0), -48 + (i % 9) * 12);
    group.add(box);
  }
}

function addAlpine(group: THREE.Group, circuit: CircuitSpec) {
  const trunk = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 6);
  const crown = new THREE.ConeGeometry(2.3, 6.5, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x66503d, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x244d37, roughness: 1 });
  const samples = sampleCircuit(circuit, 28);
  for (const [index, point] of samples.entries()) {
    const side = index % 2 === 0 ? -1 : 1;
    const rightX = Math.cos(point.heading);
    const rightZ = -Math.sin(point.heading);
    const distance = circuit.width / 2 + 16 + (index % 3) * 4;
    const x = point.x + rightX * distance * side;
    const z = point.z + rightZ * distance * side;
    const t = new THREE.Mesh(trunk, trunkMat);
    const c = new THREE.Mesh(crown, crownMat);
    t.position.set(x, 1.6, z);
    c.position.set(x, 5.8, z);
    group.add(t, c);
  }
}
