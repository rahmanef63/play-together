import { disposeSceneResources } from "@play-together/game-sdk";
import * as THREE from "three";
import { type TrackSpec, trackById } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
import { addTrackEnvironment } from "./environment.js";
import { createGroundMaterial, createRoadMaterial } from "./proceduralTextures.js";
import { batchStaticWorld } from "./staticWorld.js";
import { addTrackDecor } from "./trackDecor.js";

export interface TrackWorld {
  group: THREE.Group;
}
export function createTrackScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x40352b, 2));
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.2);
  sun.position.set(-55, 95, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun);
  return { renderer, scene, camera };
}
export function createTrackWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  trackId: string,
): TrackWorld {
  const track = trackById(trackId),
    group = new THREE.Group();
  group.name = `track-${track.id}`;
  renderer.setClearColor(track.palette.sky);
  scene.fog = new THREE.Fog(track.palette.sky, 120, 310);
  group.add(createGround(track), createRoad(track));
  addTrackDecor(group, track);
  addTrackEnvironment(group, track);
  batchStaticWorld(group);
  scene.add(group);
  return { group };
}
export function disposeTrackWorld(scene: THREE.Scene, world: TrackWorld) {
  scene.remove(world.group);
  disposeSceneResources(world.group);
}
function createGround(track: TrackSpec) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    createGroundMaterial(track.palette.ground),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.05;
  mesh.receiveShadow = true;
  return mesh;
}
function createRoad(track: TrackSpec) {
  const points = sampleTrack(track, 220),
    closed = [...points, points[0]],
    vertices: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (const [index, point] of closed.entries()) {
    if (!point) continue;
    const rx = Math.cos(point.heading),
      rz = -Math.sin(point.heading),
      half = track.width / 2,
      v = index / points.length;
    vertices.push(
      point.x - rx * half,
      0,
      point.z - rz * half,
      point.x + rx * half,
      0,
      point.z + rz * half,
    );
    uvs.push(0, v, 1, v);
  }
  for (let index = 0; index < points.length; index++) {
    const a = index * 2,
      b = a + 1,
      c = a + 2,
      d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, createRoadMaterial(track.palette.road));
  road.receiveShadow = true;
  return road;
}
