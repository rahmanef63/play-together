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

export function createFlightScene(root: HTMLElement): FlightScene {
  const host = document.createElement("section");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#87ceeb";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  const hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:white;font:800 13px system-ui;text-shadow:0 2px 4px #000;padding:12px;display:grid;grid-template-rows:auto 1fr auto";
  const top = document.createElement("div");
  const middle = document.createElement("div");
  const bottom = document.createElement("div");
  middle.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px";
  const horizon = document.createElement("div");
  horizon.style.cssText =
    "width:116px;height:116px;border:3px solid #e2e8f0;border-radius:50%;overflow:hidden;position:relative;background:linear-gradient(#4ea4dc 0 50%,#7c5b35 50%);box-shadow:0 0 0 2px #0008";
  const horizonLine = document.createElement("div");
  horizonLine.style.cssText =
    "position:absolute;left:-30%;right:-30%;top:50%;height:3px;background:white;transform-origin:center";
  const wings = document.createElement("div");
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
  renderer.setClearColor(0x88cfee);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb9dcf0, 180, 650);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 1000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4d5e33, 2.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-100, 180, -80);
  scene.add(sun);
  const rings = addFlightWorld(scene);
  return { host, renderer, scene, camera, top, bottom, horizonLine, rings };
}

export function createPlaneMesh(color: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 5.2, 12), material);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 1.05), material);
  wing.position.z = -0.2;
  group.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.7), material);
  tail.position.z = -2.25;
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.8), material);
  fin.position.set(0, 0.55, -2.2);
  group.add(fin);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
  );
  canopy.scale.set(1, 0.75, 1.25);
  canopy.position.set(0, 0.5, 0.55);
  group.add(canopy);
  return group;
}

function addFlightWorld(scene: THREE.Scene): THREE.Mesh[] {
  const terrain = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x567a35, roughness: 1 }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.02;
  scene.add(terrain);
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 130),
    new THREE.MeshStandardMaterial({ color: 0x30343b, roughness: 0.95 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.02, -110);
  scene.add(runway);
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = -166; z < -50; z += 12) {
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), markMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(0, 0.04, z);
    scene.add(marker);
  }
  for (const x of [-10.3, 10.3])
    for (let z = -170; z < -46; z += 8) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xeaf8ff }),
      );
      light.position.set(x, 0.18, z);
      scene.add(light);
    }
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x53633d, roughness: 1 });
  for (let i = 0; i < 34; i++) {
    const a = i * 1.91;
    const radius = 150 + (i % 8) * 28;
    const height = 30 + (i % 7) * 10;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(20 + (i % 5) * 5, height, 7),
      mountainMat,
    );
    mountain.position.set(Math.cos(a) * radius, height / 2, Math.sin(a) * radius - 15);
    scene.add(mountain);
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
  ].map((point) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.45, 10, 40), ringMaterial.clone());
    ring.position.set(point.x, point.y, point.z);
    scene.add(ring);
    return ring;
  });
}
