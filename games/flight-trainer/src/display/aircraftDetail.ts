import * as THREE from "three";
export function addAircraftDetail(group: THREE.Group) {
  const white = new THREE.MeshStandardMaterial({
    color: 0xf1eee5,
    metalness: 0.15,
    roughness: 0.5,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x243448, metalness: 0.6, roughness: 0.3 });
  const stripe = (x: number, color: number) => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 1.17), white);
    band.position.set(x, 0.02, -0.1);
    group.add(band);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 4),
      new THREE.MeshBasicMaterial({ color }),
    );
    tip.position.set(Math.sign(x) * 3.66, 0.05, -0.1);
    group.add(tip);
  };
  stripe(-3.05, 0x43ff7d);
  stripe(3.05, 0xff4545);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.25, 6), dark);
    strut.position.set(side * 1.35, -0.3, 0);
    strut.rotation.z = side * -1.22;
    group.add(strut);
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.7), dark);
    window.position.set(side * 0.49, 0.45, 0.65);
    group.add(window);
  }
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), white);
  spinner.position.z = 3.95;
  spinner.rotation.x = Math.PI / 2;
  group.add(spinner);
}
