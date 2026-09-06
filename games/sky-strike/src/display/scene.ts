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
const standard = (color: number, metalness = 0.2) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.38 });
const add = (
  g: THREE.Group,
  name: string,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
};
export function createSkyScene(root: HTMLElement): SkyScene {
  const host = document.createElement("section"),
    canvas = document.createElement("canvas"),
    hud = document.createElement("div"),
    top = document.createElement("div"),
    center = document.createElement("div"),
    bottom = document.createElement("div");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#4da3df";
  canvas.style.cssText = "width:100%;height:100%;display:block";
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:#eefcff;font:900 14px system-ui;text-shadow:0 2px 5px #001;padding:12px;display:grid;grid-template-rows:auto 1fr auto;letter-spacing:.05em";
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
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x69b7e8);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x91d1ef, 150, 560);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x193d51, 2.4));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.7);
  sun.position.set(80, 140, -70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  addWorld(scene);
  return { host, renderer, scene, camera, top, center, bottom };
}
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
  g.userData.parts = {
    exhaust,
    leftAileron,
    rightAileron,
    rudder,
  };
  return g;
}
function addWorld(scene: THREE.Scene) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), standard(0x17668f, 0.15));
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);
  const island = standard(0x657b3b);
  for (let i = 0; i < 26; i++) {
    const a = i * 1.93,
      r = 70 + (i % 7) * 38,
      h = 7 + (i % 4) * 7,
      m = new THREE.Mesh(new THREE.ConeGeometry(12 + (i % 3) * 7, h, 7), island);
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    m.castShadow = true;
    scene.add(m);
  }
  const cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  for (let i = 0; i < 25; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(7 + (i % 4) * 2, 8, 6), cloud);
    m.scale.set(2, 0.55, 1);
    m.position.set(Math.sin(i * 2.7) * 230, 70 + (i % 5) * 14, Math.cos(i * 1.8) * 230);
    scene.add(m);
  }
}
