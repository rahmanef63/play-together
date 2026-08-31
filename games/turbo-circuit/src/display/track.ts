import * as THREE from "three";
import { RX, RZ, tangentHeading, TRACK_WIDTH as W } from "./math.js";

export function createTrackScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x8ac9ff);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xaad8ff, 120, 260);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50632d, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-50, 90, -40);
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshStandardMaterial({ color: 0x4f7f32, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  scene.add(ground);
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, RX + W / 2, RZ + W / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, RX - W / 2, RZ - W / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const road = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 96),
    new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.95, side: THREE.DoubleSide }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);
  const infieldShape = new THREE.Shape();
  infieldShape.absellipse(0, 0, RX - W / 2 - 1.4, RZ - W / 2 - 1.4, 0, Math.PI * 2, false);
  const infield = new THREE.Mesh(
    new THREE.ShapeGeometry(infieldShape, 72),
    new THREE.MeshStandardMaterial({ color: 0x3f742d, roughness: 1 }),
  );
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.005;
  scene.add(infield);
  addCurbs(scene);
  addStartAndLaneMarks(scene);
  addBarriers(scene);
  return { renderer, scene, camera };
}

function addCurbs(scene: THREE.Scene) {
  const geometry = new THREE.BoxGeometry(0.85, 0.12, 2.5);
  const red = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xdc3346, roughness: 0.82 }),
    96,
  );
  const white = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.82 }),
    96,
  );
  const dummy = new THREE.Object3D();
  let redIndex = 0;
  let whiteIndex = 0;
  for (const sign of [-1, 1])
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const rx = RX + sign * (W / 2 - 0.35);
      const rz = RZ + sign * (W / 2 - 0.35);
      dummy.position.set(rx * Math.cos(a), 0.08, rz * Math.sin(a));
      dummy.rotation.set(0, tangentHeading(a, rx, rz), 0);
      dummy.updateMatrix();
      if (i % 2 === 0) red.setMatrixAt(redIndex++, dummy.matrix);
      else white.setMatrixAt(whiteIndex++, dummy.matrix);
    }
  red.instanceMatrix.needsUpdate = true;
  white.instanceMatrix.needsUpdate = true;
  scene.add(red, white);
}
function addStartAndLaneMarks(scene: THREE.Scene) {
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 });
  for (let lane = 0; lane < 8; lane++)
    for (let side = 0; side < 2; side++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.045, W / 8),
        (lane + side) % 2 === 0 ? white : dark,
      );
      tile.position.set((side - 0.5) * 1.3, 0.075, -RZ - W / 2 + W / 16 + lane * (W / 8));
      scene.add(tile);
    }
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf6d44a });
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const x = RX * Math.cos(a);
    const z = RZ * Math.sin(a);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 2.8), stripe);
    marker.position.set(x, 0.05, z);
    marker.rotation.y = Math.atan2(-RX * Math.sin(a), RZ * Math.cos(a));
    scene.add(marker);
  }
}
function addBarriers(scene: THREE.Scene) {
  const mats = [
    new THREE.MeshStandardMaterial({ color: 0xe7e7e7, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xd83b4f, roughness: 0.8 }),
  ];
  for (const sign of [-1, 1])
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2;
      const rx = RX + sign * (W / 2 + 1.2);
      const rz = RZ + sign * (W / 2 + 1.2);
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.85, 2.5),
        mats[Math.floor(i / 3) % mats.length],
      );
      marker.position.set(rx * Math.cos(a), 0.42, rz * Math.sin(a));
      marker.rotation.y = tangentHeading(a, rx, rz);
      scene.add(marker);
    }
}
