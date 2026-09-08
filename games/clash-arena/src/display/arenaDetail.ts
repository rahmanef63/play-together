import * as THREE from "three";
export function addArenaDetail(scene: THREE.Scene) {
  const steel = new THREE.MeshStandardMaterial({
    color: 0x48546c,
    metalness: 0.7,
    roughness: 0.35,
  });
  const light = new THREE.MeshBasicMaterial({ color: 0xffdeb2 });
  for (const side of [-1, 1]) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7, 0.3), steel);
    truss.position.set(side * 7.5, 3.5, -4.5);
    scene.add(truss);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.22, 0.3), steel);
    beam.position.set(0, 6.8, -4.5);
    scene.add(beam);
    for (let i = 0; i < 5; i++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.3), light);
      lamp.position.set(side * (1.4 + i * 1.25), 6.55, -4.3);
      scene.add(lamp);
    }
  }
  const stripe = new THREE.MeshStandardMaterial({
    color: 0x697c90,
    metalness: 0.3,
    roughness: 0.65,
  });
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.018, 0.38), stripe);
    mark.position.set(Math.cos(a) * 5.35, 0.268, Math.sin(a) * 5.35);
    mark.rotation.y = -a + Math.PI / 2;
    scene.add(mark);
  }
}
