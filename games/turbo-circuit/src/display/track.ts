import * as THREE from "three";
import { type TrackSpec, trackById } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
import { addTrackEnvironment } from "./environment.js";
import { createGroundMaterial, createRoadMaterial } from "./proceduralTextures.js";
import { addTrackDecor } from "./trackDecor.js";

interface DisposableMaterial {
  dispose(): void;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
}
export interface TrackWorld {
  group: THREE.Group;
  boostMaterial: THREE.MeshBasicMaterial;
}
export function createTrackScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x40352b, 2));
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.2);
  sun.position.set(-55, 95, -40);
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
  const boostMaterial = addTrackDecor(group, track);
  addTrackEnvironment(group, track);
  scene.add(group);
  return { group, boostMaterial };
}
export function updateTrackWorld(world: TrackWorld, now: number) {
  world.boostMaterial.opacity = 0.68 + Math.abs(Math.sin(now * 0.008)) * 0.3;
}
export function disposeTrackWorld(scene: THREE.Scene, world: TrackWorld) {
  scene.remove(world.group);
  world.group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) for (const item of material) disposeMaterial(item);
    else if (material) disposeMaterial(material);
  });
}
function createGround(track: TrackSpec) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    createGroundMaterial(track.palette.ground),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.05;
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
  return new THREE.Mesh(geometry, createRoadMaterial(track.palette.road));
}
function disposeMaterial(material: DisposableMaterial) {
  material.map?.dispose();
  material.normalMap?.dispose();
  material.roughnessMap?.dispose();
  material.dispose();
}
