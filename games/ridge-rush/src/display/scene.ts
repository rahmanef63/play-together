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
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  renderer.setClearColor(0x8bc8dd);
  scene.fog = new THREE.Fog(0x8bc8dd, 90, 430);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 720);
  scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x29432c, 2.4));
  const sun = new THREE.DirectionalLight(0xffe5b2, 2.2);
  sun.position.set(-18, 60, -30);
  scene.add(sun);

  scene.add(ribbon(82, 0, 0, COURSE_LENGTH, 0x4c713f, -0.16));
  scene.add(ribbon(9.8, 0, 0, FINISH_PROGRESS + 8, 0x795337, -0.04));
  scene.add(ribbon(3.6, SHORTCUT_CENTER, SHORTCUT_START, SHORTCUT_END, 0x99683d, 0.01));
  addMountainBackdrop(scene);
  addVegetation(scene);
  addRocks(scene);
  addRamps(scene);
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

function ribbon(
  width: number,
  offset: number,
  start: number,
  end: number,
  color: number,
  yOffset: number,
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const step = 5;
  let row = 0;
  for (let p = start; p <= end + 0.1; p = Math.min(end, p + step)) {
    const center = centerLine(p) + offset;
    const y = courseElevation(p) + yOffset;
    vertices.push(center - width / 2, y, p, center + width / 2, y, p);
    if (row > 0) {
      const a = row * 2;
      indices.push(a - 2, a, a - 1, a, a + 1, a - 1);
    }
    row += 1;
    if (p === end) break;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
}

function createGate(progress: number, color: number): THREE.Group {
  const group = new THREE.Group();
  const x = centerLine(progress);
  const y = courseElevation(progress);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4, 8), material);
    pole.position.set(x + side * 4.5, y + 2, progress);
    group.add(pole);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.32, 0.22), material);
  banner.position.set(x, y + 3.8, progress);
  group.add(banner);
  return group;
}

function addRamps(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({ color: 0xa06b3e, roughness: 0.95 });
  for (const zone of JUMP_ZONES) {
    const p = (zone.start + zone.end) / 2;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 4.2), material);
    ramp.position.set(centerLine(p), courseElevation(p) + 0.18, p);
    ramp.rotation.x = -0.08;
    scene.add(ramp);
  }
}

function addVegetation(scene: THREE.Scene) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x513721, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f5b35, roughness: 1 });
  for (let p = 26; p < COURSE_LENGTH; p += 23) {
    for (const side of [-1, 1]) {
      if ((Math.floor(p) + side) % 5 === 0) continue;
      const x = centerLine(p) + side * (10 + ((p * 7) % 12));
      const y = courseElevation(p);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.8, 6), trunkMat);
      trunk.position.set(x, y + 1.4, p);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.8, 7), leafMat);
      crown.position.set(x, y + 4.7, p);
      scene.add(trunk, crown);
    }
  }
}

function addRocks(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({ color: 0x6d746f, roughness: 1 });
  for (const base of [446, 474, 500, 895, 918, 940]) {
    const rock = new THREE.Mesh(new THREE.SphereGeometry(0.55 + (base % 3) * 0.16, 7, 5), material);
    rock.position.set(
      centerLine(base) + ((base % 5) - 2) * 1.35,
      courseElevation(base) + 0.35,
      base,
    );
    scene.add(rock);
  }
}

function addMountainBackdrop(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({ color: 0x587157, roughness: 1 });
  for (const side of [-1, 1])
    for (let p = 120; p < COURSE_LENGTH; p += 180) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(18, 36, 7), material);
      mountain.position.set(side * 42 + centerLine(p), courseElevation(p) + 14, p + 36);
      scene.add(mountain);
    }
}
