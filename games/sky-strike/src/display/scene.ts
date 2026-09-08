import * as THREE from "three";
import { addWorld } from "./world.js";
export interface SkyScene {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  top: HTMLElement;
  guide: HTMLElement;
  center: HTMLElement;
  bottom: HTMLElement;
}
export function createSkyScene(root: HTMLElement): SkyScene {
  const host = document.createElement("section"),
    canvas = document.createElement("canvas"),
    hud = document.createElement("div"),
    top = document.createElement("div"),
    guide = document.createElement("div"),
    center = document.createElement("div"),
    bottom = document.createElement("div");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#4da3df";
  canvas.style.cssText = "width:100%;height:100%;display:block";
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:#eefcff;font:900 14px system-ui;text-shadow:0 2px 5px #001;padding:12px;display:grid;grid-template-rows:auto 1fr auto;letter-spacing:.05em";
  center.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:flex;justify-content:space-between;align-items:end";
  guide.className = "sky-target-guide";
  guide.style.cssText =
    "text-align:center;padding:6px;background:#061624cc;border-radius:6px;font-size:11px";
  hud.style.gridTemplateRows = "auto 1fr auto auto";
  hud.style.gap = "5px";
  hud.append(top, center, guide, bottom);
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
  return { host, renderer, scene, camera, top, guide, center, bottom };
}
