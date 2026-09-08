import * as THREE from "three";
import { addFlightWorld } from "./world.js";

export interface FlightScene {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  top: HTMLElement;
  navigation: HTMLElement;
  bottom: HTMLElement;
  horizonLine: HTMLElement;
  rings: THREE.Mesh[];
}
export function createFlightScene(root: HTMLElement): FlightScene {
  const host = document.createElement("section"),
    canvas = document.createElement("canvas"),
    hud = document.createElement("div"),
    top = document.createElement("div"),
    navigation = document.createElement("div"),
    middle = document.createElement("div"),
    bottom = document.createElement("div"),
    horizon = document.createElement("div"),
    horizonLine = document.createElement("div"),
    wings = document.createElement("div");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#87ceeb";
  canvas.style.cssText = "width:100%;height:100%;display:block";
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:#f8fbff;font:800 13px system-ui;text-shadow:0 2px 5px #001;padding:12px;display:grid;grid-template-rows:auto 1fr auto;letter-spacing:.04em";
  middle.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px";
  horizon.style.cssText =
    "width:clamp(42px,20vh,116px);height:clamp(42px,20vh,116px);border:2px solid #e2e8f0;border-radius:50%;overflow:hidden;position:relative;background:linear-gradient(#4ea4dc 0 50%,#775735 50%);box-shadow:0 0 0 2px #001a,0 8px 20px #0018";
  horizonLine.style.cssText =
    "position:absolute;left:-30%;right:-30%;top:50%;height:3px;background:white;transform-origin:center";
  wings.style.cssText = "position:absolute;left:18%;right:18%;top:49%;border-top:3px solid #facc15";
  horizon.append(horizonLine, wings);
  navigation.className = "flight-navigation";
  navigation.style.cssText =
    "align-self:end;text-align:center;padding:6px 8px;background:#061624cc;border-radius:6px;font-size:11px";
  middle.style.gridTemplateRows = "1fr auto";
  middle.append(horizon, navigation);
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
  return {
    host,
    renderer,
    scene,
    camera,
    top,
    navigation,
    bottom,
    horizonLine,
    rings: addFlightWorld(scene),
  };
}
