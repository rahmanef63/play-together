import * as THREE from "three";
import { addAircraftDetail } from "./aircraftDetail.js";

const material = (color: number, metalness = 0.15) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness });
const part = (
  group: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

export function createPlaneMesh(color: number) {
  const group = new THREE.Group(),
    paint = material(color, 0.25),
    dark = material(0x15202e, 0.5),
    rubber = material(0x111111),
    glow = new THREE.MeshBasicMaterial({ color: 0xffd36b });
  part(group, "fuselage", new THREE.CylinderGeometry(0.38, 0.62, 4.9, 14), paint).rotation.x =
    Math.PI / 2;
  const nose = part(group, "nose", new THREE.ConeGeometry(0.39, 1.35, 14), paint, 0, 0, 3.1);
  nose.rotation.x = -Math.PI / 2;
  part(group, "mainWing", new THREE.BoxGeometry(7.3, 0.13, 1.15), paint, 0, 0, -0.1);
  const leftAileron = part(
    group,
    "leftAileron",
    new THREE.BoxGeometry(1.6, 0.09, 0.38),
    dark,
    -2.55,
    0.02,
    -0.22,
  );
  const rightAileron = part(
    group,
    "rightAileron",
    new THREE.BoxGeometry(1.6, 0.09, 0.38),
    dark,
    2.55,
    0.02,
    -0.22,
  );
  part(group, "tailplane", new THREE.BoxGeometry(2.5, 0.1, 0.65), paint, 0, 0.12, -2.25);
  const elevator = part(
    group,
    "elevator",
    new THREE.BoxGeometry(1.5, 0.08, 0.25),
    dark,
    0,
    0.13,
    -2.52,
  );
  const rudder = part(
    group,
    "rudder",
    new THREE.BoxGeometry(0.1, 1.25, 0.7),
    paint,
    0,
    0.62,
    -2.25,
  );
  const canopy = part(
    group,
    "canopy",
    new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
    0,
    0.48,
    0.55,
  );
  canopy.scale.set(1, 0.72, 1.3);
  const propeller = new THREE.Group();
  propeller.name = "propeller";
  propeller.position.z = 3.73;
  for (const angle of [0, Math.PI / 2]) {
    const blade = part(propeller, "blade", new THREE.BoxGeometry(0.16, 2.5, 0.06), dark);
    blade.rotation.z = angle;
  }
  group.add(propeller);
  const gear: THREE.Object3D[] = [];
  for (const x of [-0.75, 0.75]) {
    const strut = part(
      group,
      "gearStrut",
      new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6),
      rubber,
      x,
      -0.5,
      0.55,
    );
    strut.rotation.z = x * 0.4;
    const wheel = part(
      group,
      "wheel",
      new THREE.TorusGeometry(0.22, 0.08, 6, 10),
      rubber,
      x,
      -0.85,
      0.55,
    );
    wheel.rotation.y = Math.PI / 2;
    gear.push(strut, wheel);
  }
  const lamp = part(group, "navLight", new THREE.SphereGeometry(0.08, 6, 4), glow, 3.62, 0, -0.1);
  lamp.name = "navLight";
  addAircraftDetail(group);
  group.userData.parts = { propeller, leftAileron, rightAileron, elevator, rudder, gear, glow };
  return group;
}
