import * as THREE from "three";

export interface SkyScene {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  top: HTMLElement;
  center: HTMLElement;
  bottom: HTMLElement;
}

export function createSkyScene(root: HTMLElement): SkyScene {
  const host = document.createElement("section");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#4da3df";
  const canvas = document.createElement("canvas");
  const hud = document.createElement("div");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:#eefcff;font:900 14px system-ui;text-shadow:0 2px 5px #001;padding:12px;display:grid;grid-template-rows:auto 1fr auto";
  const top = document.createElement("div");
  const center = document.createElement("div");
  const bottom = document.createElement("div");
  center.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:flex;justify-content:space-between;align-items:end";
  hud.append(top, center, bottom);
  host.append(canvas, hud);
  root.append(host);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x69b7e8);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x91d1ef, 180, 520);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x284a58, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(80, 140, -70);
  scene.add(sun);
  addWorld(scene);
  return { host, renderer, scene, camera, top, center, bottom };
}

export function createJet(color: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 5.6, 10), material);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5, 10), material);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = 3.5;
  group.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 1.15), material);
  wing.position.z = -0.3;
  group.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.7), material);
  tail.position.z = -2.25;
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 0.9), material);
  fin.position.set(0, 0.65, -2.25);
  group.add(fin);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
  );
  canopy.scale.set(1, 0.75, 1.4);
  canopy.position.set(0, 0.5, 0.75);
  group.add(canopy);
  return group;
}

function addWorld(scene: THREE.Scene) {
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 1100),
    new THREE.MeshStandardMaterial({ color: 0x1a6890, roughness: 0.8, metalness: 0.08 }),
  );
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x657b3b, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const a = i * 1.93;
    const radius = 70 + (i % 6) * 42;
    const height = 7 + (i % 4) * 6;
    const island = new THREE.Mesh(new THREE.ConeGeometry(12 + (i % 3) * 6, height, 7), islandMat);
    island.position.set(Math.cos(a) * radius, height / 2, Math.sin(a) * radius);
    scene.add(island);
  }
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
  });
  for (let i = 0; i < 20; i++) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(7 + (i % 4) * 2, 8, 6), cloudMat);
    cloud.scale.set(2, 0.55, 1);
    cloud.position.set(Math.sin(i * 2.7) * 230, 70 + (i % 5) * 14, Math.cos(i * 1.8) * 230);
    scene.add(cloud);
  }
}
