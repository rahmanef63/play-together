import * as THREE from "three";
import {
  CHECKPOINTS,
  COURSE_LENGTH,
  centerLine,
  courseElevation,
  FINISH_PROGRESS,
  JUMP_ZONES,
  SHORTCUT_CENTER,
  SHORTCUT_END,
  SHORTCUT_START,
} from "../shared/course.js";
import { addMountainTerrain, trailColor, trailRibbon } from "./terrain.js";
export interface RidgeScene {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  gates: THREE.Group[];
}
export function createRidgeScene(host: HTMLElement): RidgeScene {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  renderer.setClearColor(0xa2abb8);
  scene.fog = new THREE.FogExp2(0x9da8b3, 0.0024);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 1150);
  scene.add(new THREE.HemisphereLight(0xe9f3ff, 0x293329, 2.1));
  const sun = new THREE.DirectionalLight(0xffd7a2, 2.6);
  sun.position.set(-80, 180, -110);
  sun.castShadow = true;
  scene.add(sun);
  addMountainTerrain(scene);
  addTrailSurfaces(scene);
  addVegetation(scene);
  addRocks(scene);
  addRamps(scene);
  addDistantPeaks(scene);
  const gates = CHECKPOINTS.map((progress, index) =>
    createGate(progress, index === CHECKPOINTS.length - 1 ? 0xfacc15 : 0x67e8f9),
  );
  for (const gate of gates) scene.add(gate);
  const finish = createGate(FINISH_PROGRESS, 0xffffff);
  finish.name = "finish-gate";
  scene.add(finish);
  gates.push(finish);
  return { host, renderer, scene, camera, gates };
}
function addTrailSurfaces(scene: THREE.Scene): void {
  for (const [start, end] of [
    [0, 520],
    [520, 920],
    [920, 1290],
    [1290, 1740],
    [1740, 2050],
    [2050, 2470],
    [2470, 2780],
    [2780, FINISH_PROGRESS + 10],
  ] as const)
    scene.add(trailRibbon(8.4, start, end, trailColor((start + end) / 2)));
  scene.add(trailRibbon(3.1, SHORTCUT_START, SHORTCUT_END, 0x8d603c, SHORTCUT_CENTER));
}
function createGate(progress: number, color: number): THREE.Group {
  const group = new THREE.Group(),
    x = centerLine(progress),
    y = courseElevation(progress),
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4, 8), material);
    pole.position.set(x + side * 3.7, y + 2, progress);
    group.add(pole);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.32, 0.22), material);
  banner.position.set(x, y + 3.8, progress);
  group.add(banner);
  return group;
}
function addRamps(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x8c5f3a, roughness: 0.96 });
  for (const zone of JUMP_ZONES) {
    const p = (zone.start + zone.end) / 2,
      ramp = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 5.5), material);
    ramp.position.set(centerLine(p), courseElevation(p) + 0.14, p);
    ramp.rotation.x = -0.11;
    scene.add(ramp);
  }
}
function addVegetation(scene: THREE.Scene): void {
  const trunk = new THREE.MeshStandardMaterial({ color: 0x49311f, roughness: 1 }),
    leaf = new THREE.MeshStandardMaterial({ color: 0x183e28, roughness: 1 });
  for (let p = 35; p < COURSE_LENGTH; p += 34) {
    for (const side of [-1, 1]) {
      if ((p + side) % 7 < 2) continue;
      const distance = 10 + ((p * 7) % 20),
        x = centerLine(p) + side * distance,
        y = courseElevation(p) + (distance > 18 ? 3 : 0);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 6), trunk),
        b = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.7, 7), leaf);
      a.position.set(x, y + 1.3, p);
      b.position.set(x, y + 4.5, p);
      scene.add(a, b);
    }
  }
}
function addRocks(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x5d5b5a, roughness: 1 });
  for (let p = 900; p < 3300; p += 97) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (p % 5) * 0.14, 0), material);
    rock.position.set(centerLine(p) + ((p % 11) - 5) * 1.1, courseElevation(p) + 0.35, p);
    scene.add(rock);
  }
}
function addDistantPeaks(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x59616a, roughness: 1 });
  for (const side of [-1, 1])
    for (let p = 180; p < COURSE_LENGTH; p += 420) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(95, 230, 7), material);
      mountain.position.set(centerLine(p) + side * 165, courseElevation(p) + 55, p + 150);
      scene.add(mountain);
    }
}
