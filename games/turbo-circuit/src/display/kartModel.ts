import * as THREE from "three";
import type { CarSpec } from "../shared/catalog.js";

export interface KartVisual {
  root: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Group[];
  frontWheels: THREE.Group[];
  exhaustFlames: THREE.Mesh[];
  driftSparks: THREE.Mesh[];
  steeringWheel: THREE.Mesh;
  carId: string;
}
export function createKartModel(car: CarSpec): KartVisual {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    dimensions = kartDimensions(car),
    bodyMat = new THREE.MeshStandardMaterial({
      color: car.color,
      roughness: 0.24,
      metalness: 0.48,
    }),
    dark = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.72 }),
    metal = new THREE.MeshStandardMaterial({ color: 0xaeb7c3, roughness: 0.22, metalness: 0.88 });
  root.add(body);
  const chassis = mesh(new THREE.BoxGeometry(dimensions.width, 0.62, dimensions.length), bodyMat);
  chassis.position.y = 0.65;
  body.add(chassis);
  const nose = mesh(new THREE.CylinderGeometry(0.56, dimensions.width * 0.48, 1.35, 12), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.58, dimensions.length * 0.54);
  body.add(nose);
  addSpoiler(body, dimensions, bodyMat);
  const exhaustFlames = addExhaust(body, dimensions, metal),
    { wheels, frontWheels } = addWheels(body, dimensions, dark, metal),
    driftSparks = addDriftSparks(body, dimensions);
  addDriver(body, car);
  body.position.y = 0.03;
  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.07, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.28, metalness: 0.42 }),
  );
  steeringWheel.rotation.x = Math.PI / 3.1;
  steeringWheel.position.set(0, 1.28, 0.62);
  body.add(steeringWheel);
  return {
    root,
    body,
    wheels,
    frontWheels,
    exhaustFlames,
    driftSparks,
    steeringWheel,
    carId: car.id,
  };
}
function kartDimensions(car: CarSpec) {
  const heavy = Math.max(0, car.weight - 1),
    light = Math.max(0, 1 - car.weight);
  return {
    width: 2.18 + heavy * 0.38 - light * 0.15,
    length: 4.15 + heavy * 0.42 - light * 0.18,
  };
}
function addSpoiler(
  group: THREE.Group,
  d: { width: number; length: number },
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  const spoiler = mesh(new THREE.BoxGeometry(d.width + 0.45, 0.14, 0.72), material);
  spoiler.position.set(0, 1.34, -d.length * 0.45);
  group.add(spoiler);
  for (const x of [-d.width * 0.34, d.width * 0.34]) {
    const post = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.76, 8), material);
    post.position.set(x, 1.02, -d.length * 0.45);
    group.add(post);
  }
}
function addExhaust(
  group: THREE.Group,
  d: { length: number },
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  const flames: THREE.Mesh[] = [];
  for (const x of [-0.5, 0.5]) {
    const pipe = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.78, 9), material);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 0.62, -d.length * 0.53);
    group.add(pipe);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.88, 7),
      new THREE.MeshBasicMaterial({ color: 0xff7a18, transparent: true, opacity: 0.9 }),
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.62, -d.length * 0.64);
    flame.visible = false;
    group.add(flame);
    flames.push(flame);
  }
  return flames;
}
function addWheels(
  group: THREE.Group,
  d: { width: number; length: number },
  tireMaterial: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
  rimMaterial: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  const wheels: THREE.Group[] = [],
    frontWheels: THREE.Group[] = [],
    offsets = [
      [-d.width * 0.58, d.length * 0.31, true],
      [d.width * 0.58, d.length * 0.31, true],
      [-d.width * 0.6, -d.length * 0.31, false],
      [d.width * 0.6, -d.length * 0.31, false],
    ] as const;
  for (const [x, z, front] of offsets) {
    const wheel = new THREE.Group(),
      tire = mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.52, 14), tireMaterial),
      rim = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.54, 12), rimMaterial);
    tire.rotation.z = Math.PI / 2;
    rim.rotation.z = Math.PI / 2;
    wheel.add(tire, rim);
    wheel.position.set(x, 0.62, z);
    group.add(wheel);
    wheels.push(wheel);
    if (front) frontWheels.push(wheel);
  }
  return { wheels, frontWheels };
}
function addDriftSparks(group: THREE.Group, d: { width: number; length: number }) {
  const sparks: THREE.Mesh[] = [];
  for (const x of [-d.width * 0.62, d.width * 0.62]) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }),
    );
    spark.position.set(x, 0.38, -d.length * 0.35);
    spark.visible = false;
    group.add(spark);
    sparks.push(spark);
  }
  return sparks;
}
function addDriver(group: THREE.Group, car: CarSpec) {
  const driver = new THREE.Group(),
    suit = mesh(
      new THREE.BoxGeometry(0.92, 1.02, 0.78),
      new THREE.MeshStandardMaterial({ color: car.color, roughness: 0.6 }),
    ),
    helmet = mesh(
      new THREE.SphereGeometry(0.58, 12, 9),
      new THREE.MeshStandardMaterial({ color: 0xe8edf4, roughness: 0.32, metalness: 0.12 }),
    ),
    visor = mesh(
      new THREE.BoxGeometry(0.74, 0.22, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x182534, roughness: 0.12, metalness: 0.5 }),
    );
  suit.position.set(0, 1.18, -0.18);
  helmet.position.set(0, 2.02, -0.18);
  visor.position.set(0, 2.02, 0.34);
  driver.add(suit, helmet, visor);
  group.add(driver);
}
function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  return new THREE.Mesh(geometry, material);
}
