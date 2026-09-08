import * as THREE from "three";
import {
  COURSE_LENGTH,
  centerLine,
  cliffSide,
  courseElevation,
  FINISH_PROGRESS,
  JUMP_ZONES,
  SHORTCUT_CENTER,
  SHORTCUT_END,
  SHORTCUT_START,
} from "../shared/course.js";
import { terrainHeight } from "../shared/terrain.js";
import { trailColor, trailRibbon } from "./terrain.js";
export function addTrailSurfaces(scene: THREE.Scene): void {
  for (const [start, end] of [
    [0, 520],
    [520, 920],
    [920, 1290],
    [1290, 1740],
    [1740, 2050],
    [2050, 2470],
    [2470, 2780],
    [2780, FINISH_PROGRESS + 10],
  ] as const) {
    const mid = (start + end) / 2;
    scene.add(trailRibbon(8.4, start, end, trailColor(mid)));
    const trackColor = mid < 520 ? 0x879493 : 0x3d3128;
    for (const offset of [-0.72, 0.72]) {
      const mark = trailRibbon(0.13, start, end, trackColor, offset);
      mark.position.y = 0.045;
      scene.add(mark);
    }
  }
  scene.add(trailRibbon(3.1, SHORTCUT_START, SHORTCUT_END, 0x8d603c, SHORTCUT_CENTER));
}
export function createGate(progress: number, color: number): THREE.Group {
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
export function addRamps(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x8c5f3a, roughness: 0.96 });
  for (const zone of JUMP_ZONES) {
    const p = (zone.start + zone.end) / 2,
      ramp = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 5.5), material);
    ramp.position.set(centerLine(p), courseElevation(p) + 0.14, p);
    ramp.rotation.x = -0.11;
    scene.add(ramp);
  }
}
export function addVegetation(scene: THREE.Scene): void {
  const trunk = new THREE.MeshStandardMaterial({ color: 0x49311f, roughness: 1 }),
    leaf = new THREE.MeshStandardMaterial({ color: 0x183e28, roughness: 1 });
  for (let p = 35; p < COURSE_LENGTH; p += 34) {
    for (const side of [-1, 1]) {
      if ((p + side) % 7 < 2) continue;
      const distance = 10 + ((p * 7) % 20),
        x = centerLine(p) + side * distance,
        y = terrainHeight(p, x);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 6), trunk),
        b = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.7, 7), leaf);
      const scale = 0.82 + ((p + side * 3) % 9) * 0.035;
      a.scale.setScalar(scale);
      b.scale.setScalar(scale);
      a.position.set(x, y + 1.3 * scale, p);
      b.position.set(x, y + 4.5 * scale, p);
      scene.add(a, b);
    }
  }
}
export function addRocks(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x5d5b5a, roughness: 1 });
  for (let p = 900; p < 3300; p += 97) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (p % 5) * 0.14, 0), material);
    rock.position.set(centerLine(p) + ((p % 11) - 5) * 1.1, courseElevation(p) + 0.35, p);
    rock.rotation.set(p * 0.01, p * 0.017, 0);
    scene.add(rock);
  }
  for (let p = 180; p < COURSE_LENGTH; p += 125) {
    const side = ((Math.floor(p / 125) % 2) * 2 - 1) as -1 | 1;
    const distance = 13 + (p % 24);
    const x = centerLine(p) + side * distance;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + (p % 7) * 0.24, 0), material);
    rock.position.set(x, terrainHeight(p, x) + 0.9, p + (p % 17));
    rock.scale.set(1.3, 0.8 + (p % 5) * 0.08, 1);
    rock.rotation.set(p * 0.009, p * 0.021, p * 0.004);
    scene.add(rock);
  }
}
export function addTrailMarkers(scene: THREE.Scene): void {
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x242a2d, roughness: 0.9 }),
    flagMaterial = new THREE.MeshStandardMaterial({ color: 0xf26b38, roughness: 0.75 });
  for (let p = 260; p < COURSE_LENGTH - 160; p += 170) {
    const cliff = cliffSide(p);
    if (!cliff) continue;
    const x = centerLine(p) + cliff * 4.15,
      y = courseElevation(p);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.5, 6), poleMaterial);
    pole.position.set(x, y + 0.72, p);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.035), flagMaterial);
    flag.position.set(x - cliff * 0.36, y + 1.27, p);
    scene.add(pole, flag);
  }
}
export function addDistantPeaks(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x59616a, roughness: 1 });
  for (const side of [-1, 1])
    for (let p = 180; p < COURSE_LENGTH; p += 420) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(95, 230, 7), material);
      mountain.position.set(centerLine(p) + side * 165, courseElevation(p) + 55, p + 150);
      scene.add(mountain);
    }
}
