import * as THREE from "three";
export function addJetDetail(group: THREE.Group) {
  const trim = new THREE.MeshStandardMaterial({
    color: 0xd6e2e9,
    metalness: 0.75,
    roughness: 0.25,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x152334, metalness: 0.6, roughness: 0.35 });
  for (const side of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 1.25), dark);
    intake.position.set(side * 0.72, -0.05, 0.15);
    group.add(intake);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 1.5), trim);
    rail.position.set(side * 2.3, -0.15, -0.4);
    group.add(rail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.7), trim);
    fin.position.set(side * 0.6, 0.55, -2.25);
    fin.rotation.z = -side * 0.27;
    group.add(fin);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.13, 0.7), trim);
    band.position.set(side * 2.7, 0.07, -0.2);
    group.add(band);
  }
}
