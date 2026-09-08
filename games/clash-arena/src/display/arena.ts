import * as THREE from "three";
import { addArenaDetail } from "./arenaDetail.js";
export function createArena() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050713);
  scene.fog = new THREE.Fog(0x050713, 9, 34);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 6.4, 13);
  camera.lookAt(0, 1, 0);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0x91c9ff, 0x130719, 2.1));
  for (const [color, x, z, power] of [
    [0xffa45d, -5, 7, 3.4],
    [0x627dff, 6, -3, 2.2],
  ] as const) {
    const l = new THREE.DirectionalLight(color, power);
    l.position.set(x, 8, z);
    l.castShadow = true;
    l.shadow.mapSize.set(1024, 1024);
    scene.add(l);
  }
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.7, 7.8, 0.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x172342, metalness: 0.55, roughness: 0.31 }),
  );
  floor.receiveShadow = true;
  scene.add(floor);
  for (const r of [2.15, 4.25]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.045, 6, 64),
      new THREE.MeshBasicMaterial({
        color: r < 3 ? 0x67e8f9 : 0x8b5cf6,
        transparent: true,
        opacity: 0.7,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;
    scene.add(ring);
  }
  for (let i = 0; i < 12; i++) {
    if (Math.sin((i * Math.PI) / 6) > 0.2) continue;
    const a = (i * Math.PI) / 6,
      p = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 3.6, 0.28),
        new THREE.MeshStandardMaterial({
          color: 0x273b70,
          emissive: 0x111d48,
          emissiveIntensity: 1.4,
        }),
      );
    p.position.set(Math.cos(a) * 6.25, 1.8, Math.sin(a) * 6.25);
    p.castShadow = true;
    scene.add(p);
  }
  addArenaDetail(scene);
  return { scene, camera, renderer };
}
