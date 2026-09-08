import * as THREE from "three";
import { CHECKPOINTS, FINISH_PROGRESS } from "../shared/course.js";
import {
  addDistantPeaks,
  addRamps,
  addRocks,
  addTrailMarkers,
  addTrailSurfaces,
  addVegetation,
  createGate,
} from "./scenery.js";
import { addMountainTerrain } from "./terrain.js";
import { addTrailDetail } from "./trailDetail.js";
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  renderer.setClearColor(0x9fb2c8);
  scene.fog = new THREE.FogExp2(0x9caebb, 0.00225);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 1150);
  scene.add(new THREE.HemisphereLight(0xe9f3ff, 0x293329, 2.1));
  const sun = new THREE.DirectionalLight(0xffd7a2, 2.6);
  sun.position.set(-80, 180, -110);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 520;
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  scene.add(sun);
  addMountainTerrain(scene);
  addTrailSurfaces(scene);
  addVegetation(scene);
  addRocks(scene);
  addTrailMarkers(scene);
  addRamps(scene);
  addDistantPeaks(scene);
  addTrailDetail(scene);
  const gates = CHECKPOINTS.map((progress, index) =>
    createGate(progress, index === CHECKPOINTS.length - 1 ? 0xfacc15 : 0x67e8f9),
  );
  for (const gate of gates) scene.add(gate);
  const finish = createGate(FINISH_PROGRESS, 0xffffff);
  finish.name = "finish-gate";
  scene.add(finish);
  gates.push(finish);
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.receiveShadow = true;
      if (object.geometry.type !== "BufferGeometry") object.castShadow = true;
    }
  });
  return { host, renderer, scene, camera, gates };
}
