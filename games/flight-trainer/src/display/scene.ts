import * as THREE from "three";

export interface FlightScene {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  top: HTMLElement;
  bottom: HTMLElement;
  horizonLine: HTMLElement;
  rings: THREE.Mesh[];
}
const mat = (color: number, metalness = 0.15) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness });
export function createFlightScene(root: HTMLElement): FlightScene {
  const host = document.createElement("section"),
    canvas = document.createElement("canvas"),
    hud = document.createElement("div"),
    top = document.createElement("div"),
    middle = document.createElement("div"),
    bottom = document.createElement("div"),
    horizon = document.createElement("div"),
    horizonLine = document.createElement("div"),
    wings = document.createElement("div");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#87ceeb";
  canvas.style.cssText = "width:100%;height:100%;display:block";
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:#f8fbff;font:800 13px system-ui;text-shadow:0 2px 5px #001;padding:12px;display:grid;grid-template-rows:auto 1fr auto;letter-spacing:.04em";
  middle.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px";
  horizon.style.cssText =
    "width:116px;height:116px;border:2px solid #e2e8f0;border-radius:50%;overflow:hidden;position:relative;background:linear-gradient(#4ea4dc 0 50%,#775735 50%);box-shadow:0 0 0 2px #001a,0 8px 20px #0018";
  horizonLine.style.cssText =
    "position:absolute;left:-30%;right:-30%;top:50%;height:3px;background:white;transform-origin:center";
  wings.style.cssText = "position:absolute;left:18%;right:18%;top:49%;border-top:3px solid #facc15";
  horizon.append(horizonLine, wings);
  middle.append(horizon);
  hud.append(top, middle, bottom);
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
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x88cfee);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb9dcf0, 150, 650);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 1000);
  scene.add(new THREE.HemisphereLight(0xe8f7ff, 0x40522d, 2.1));
  const sun = new THREE.DirectionalLight(0xfff3d6, 2.8);
  sun.position.set(-100, 180, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  return { host, renderer, scene, camera, top, bottom, horizonLine, rings: addFlightWorld(scene) };
}
function addFlightWorld(scene: THREE.Scene): THREE.Mesh[] {
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), mat(0x567a35));
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(22, 130), mat(0x30343b));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.02, -110);
  runway.receiveShadow = true;
  scene.add(runway);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = -166; z < -50; z += 12) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), white);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.04, z);
    scene.add(m);
  }
  const rock = mat(0x53633d);
  for (let i = 0; i < 42; i++) {
    const a = i * 1.91,
      r = 150 + (i % 8) * 28,
      h = 25 + (i % 7) * 11,
      m = new THREE.Mesh(new THREE.ConeGeometry(14 + (i % 5) * 5, h, 7), rock);
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - 15);
    m.castShadow = true;
    scene.add(m);
  }
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.62,
  });
  return [
    { x: 0, y: 24, z: -25 },
    { x: 78, y: 45, z: 35 },
    { x: 25, y: 68, z: 125 },
    { x: -92, y: 56, z: 82 },
    { x: -72, y: 38, z: -18 },
    { x: 0, y: 16, z: -78 },
  ].map((p) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(8, 0.45, 10, 40), ringMaterial.clone());
    r.position.set(p.x, p.y, p.z);
    scene.add(r);
    return r;
  });
}
