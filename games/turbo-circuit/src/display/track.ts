import * as THREE from "three";
import { type TrackSpec, trackById } from "../shared/catalog.js";
import { featurePoses, sampleTrack } from "../shared/trackMath.js";
import { addTrackEnvironment } from "./environment.js";
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
) {
  const track = trackById(trackId),
    group = new THREE.Group();
  group.name = `track-${track.id}`;
  renderer.setClearColor(track.palette.sky);
  scene.fog = new THREE.Fog(track.palette.sky, 120, 310);
  group.add(createGround(track), createRoad(track));
  addEdges(group, track);
  addStartGrid(group, track);
  addBoostPads(group, track);
  addTrackEnvironment(group, track);
  scene.add(group);
  return group;
}
export function disposeTrackWorld(scene: THREE.Scene, group: THREE.Group) {
  scene.remove(group);
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) for (const item of material) item.dispose();
    else material?.dispose?.();
  });
}
function createGround(track: TrackSpec) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    new THREE.MeshStandardMaterial({ color: track.palette.ground, roughness: 1 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.05;
  return mesh;
}
function createRoad(track: TrackSpec) {
  const points = sampleTrack(track, 220),
    vertices: number[] = [],
    indices: number[] = [];
  for (const p of points) {
    const rx = Math.cos(p.heading),
      rz = -Math.sin(p.heading),
      half = track.width / 2;
    vertices.push(p.x - rx * half, 0, p.z - rz * half, p.x + rx * half, 0, p.z + rz * half);
  }
  for (let i = 0; i < points.length; i++) {
    const n = (i + 1) % points.length,
      a = i * 2,
      b = a + 1,
      c = n * 2,
      d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: track.palette.road,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
}
function addEdges(group: THREE.Group, track: TrackSpec) {
  const samples = sampleTrack(track, 92),
    curbGeo = new THREE.BoxGeometry(1.15, 0.12, 2.55),
    barrierGeo = new THREE.BoxGeometry(0.5, 0.78, 2.9),
    red = new THREE.MeshStandardMaterial({ color: 0xcf3f48, roughness: 0.82 }),
    white = new THREE.MeshStandardMaterial({ color: 0xf0eee7, roughness: 0.82 });
  for (const side of [-1, 1])
    for (const [i, p] of samples.entries()) {
      const rx = Math.cos(p.heading),
        rz = -Math.sin(p.heading),
        curb = new THREE.Mesh(curbGeo, i % 2 === 0 ? red : white),
        off = side * (track.width / 2 - 0.32);
      curb.position.set(p.x + rx * off, 0.08, p.z + rz * off);
      curb.rotation.y = p.heading;
      group.add(curb);
      if (i % 2) continue;
      const barrier = new THREE.Mesh(barrierGeo, Math.floor(i / 2) % 2 === 0 ? white : red),
        boff = side * (track.width / 2 + 1.1);
      barrier.position.set(p.x + rx * boff, 0.39, p.z + rz * boff);
      barrier.rotation.y = p.heading;
      group.add(barrier);
    }
}
function addStartGrid(group: THREE.Group, track: TrackSpec) {
  const start = sampleTrack(track)[0];
  if (!start) return;
  const rx = Math.cos(start.heading),
    rz = -Math.sin(start.heading);
  for (let lane = 0; lane < 10; lane++) {
    const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.05, track.width / 10),
        new THREE.MeshStandardMaterial({
          color: lane % 2 === 0 ? 0xf6f3eb : 0x17191c,
          roughness: 0.9,
        }),
      ),
      lateral = -track.width / 2 + track.width / 20 + lane * (track.width / 10);
    tile.position.set(start.x + rx * lateral, 0.07, start.z + rz * lateral);
    tile.rotation.y = start.heading;
    group.add(tile);
  }
}
function addBoostPads(group: THREE.Group, track: TrackSpec) {
  const mat = new THREE.MeshBasicMaterial({
    color: track.palette.accent,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  for (const pad of featurePoses(track, track.features.boostPads, [0])) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.6), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -pad.heading;
    mesh.position.set(pad.x, 0.08, pad.z);
    group.add(mesh);
    for (const offset of [-2.2, 0, 2.2]) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 3.4),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        }),
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = -pad.heading;
      const rx = Math.cos(pad.heading),
        rz = -Math.sin(pad.heading);
      stripe.position.set(pad.x + rx * offset, 0.09, pad.z + rz * offset);
      group.add(stripe);
    }
  }
}
