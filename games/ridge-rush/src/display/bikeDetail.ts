import * as THREE from "three";
export function addBikeDetail(root: THREE.Group, bike: THREE.Group, rider: THREE.Group) {
  const alloy = new THREE.MeshStandardMaterial({
    color: 0xbac9ce,
    metalness: 0.8,
    roughness: 0.28,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x17212d, roughness: 0.9 });
  for (const name of ["front-wheel", "rear-wheel"]) {
    const wheel = root.getObjectByName(name);
    if (!wheel) continue;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 5, 24), alloy);
    wheel.add(rim);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.68, 0.015), alloy);
      spoke.rotation.z = (i * Math.PI) / 8;
      wheel.add(spoke);
    }
    const disc = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 5, 14), alloy);
    disc.position.z = 0.075;
    wheel.add(disc);
  }
  for (const side of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 8), alloy);
    fork.position.set(side * 0.09, 0.7, 0.64);
    fork.rotation.x = -0.13;
    bike.add(fork);
  }
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.38), rubber);
  saddle.position.set(0, 0.94, -0.14);
  bike.add(saddle);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.13), rubber);
  visor.position.set(0, 1.67, 0.51);
  rider.add(visor);
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.22), rubber);
  chin.position.set(0, 1.52, 0.5);
  rider.add(chin);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.15), rubber);
  pack.position.set(0, 1.28, -0.1);
  pack.rotation.x = 0.5;
  rider.add(pack);
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), rubber);
    pad.position.set(side * 0.24, 1.16, 0.35);
    rider.add(pad);
  }
}
