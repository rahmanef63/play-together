import * as THREE from "three";
import { addJetDetail } from "./jetDetail.js";
import { add, standard } from "./mesh.js";
export function createJet(color: number) {
  const g = new THREE.Group(),
    paint = standard(color, 0.65),
    dark = standard(0x101827, 0.7),
    hot = new THREE.MeshBasicMaterial({ color: 0x62d9ff, transparent: true, opacity: 0.85 });
  add(g, "fuselage", new THREE.CylinderGeometry(0.42, 0.72, 5.5, 12), paint).rotation.x =
    Math.PI / 2;
  const nose = add(g, "nose", new THREE.ConeGeometry(0.43, 1.65, 12), paint, 0, 0, 3.45);
  nose.rotation.x = -Math.PI / 2;
  add(
    g,
    "deltaWing",
    new THREE.CylinderGeometry(0.15, 3.45, 0.12, 3),
    paint,
    0,
    0,
    -0.05,
  ).rotation.y = Math.PI / 2;
  const leftAileron = add(
    g,
    "leftAileron",
    new THREE.BoxGeometry(1.25, 0.08, 0.42),
    dark,
    -2.25,
    0.03,
    -0.25,
  );
  const rightAileron = add(
    g,
    "rightAileron",
    new THREE.BoxGeometry(1.25, 0.08, 0.42),
    dark,
    2.25,
    0.03,
    -0.25,
  );
  add(g, "tailplane", new THREE.BoxGeometry(2.3, 0.1, 0.65), paint, 0, 0.08, -2.25);
  const rudder = add(g, "rudder", new THREE.BoxGeometry(0.1, 1.45, 0.8), paint, 0, 0.7, -2.3);
  const canopy = add(
    g,
    "canopy",
    new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
    0,
    0.48,
    0.72,
  );
  canopy.scale.set(1, 0.72, 1.45);
  const exhaust = new THREE.Group();
  exhaust.name = "exhaust";
  exhaust.position.z = -3;
  for (const x of [-0.28, 0.28]) {
    add(
      exhaust,
      "nozzle",
      new THREE.CylinderGeometry(0.22, 0.3, 0.42, 10),
      dark,
      x,
      0,
      0,
    ).rotation.x = Math.PI / 2;
    const flame = add(exhaust, "flame", new THREE.ConeGeometry(0.18, 1.5, 8), hot, x, 0, -0.85);
    flame.rotation.x = Math.PI / 2;
  }
  g.add(exhaust);
  addJetDetail(g);
  g.userData.parts = {
    exhaust,
    leftAileron,
    rightAileron,
    rudder,
  };
  return g;
}
