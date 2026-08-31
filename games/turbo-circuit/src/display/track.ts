import * as THREE from "three";
import { type CircuitSpec, circuitById, sampleCircuit } from "../shared/catalog.js";
import { addCircuitEnvironment } from "./environment.js";

export function createTrackScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x405031, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-55, 95, -40);
  scene.add(sun);
  return { renderer, scene, camera };
}

export function createCircuitWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  circuitId: string,
) {
  const circuit = circuitById(circuitId);
  const group = new THREE.Group();
  group.name = `circuit-${circuit.id}`;
  renderer.setClearColor(circuit.palette.sky);
  scene.fog = new THREE.Fog(circuit.palette.sky, 125, 300);
  group.add(createGround(circuit), createRoad(circuit));
  addEdges(group, circuit);
  addStartGrid(group, circuit);
  addCircuitEnvironment(group, circuit);
  scene.add(group);
  return group;
}

export function disposeCircuitWorld(scene: THREE.Scene, group: THREE.Group) {
  scene.remove(group);
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) for (const item of material) item.dispose();
    else material?.dispose?.();
  });
}

function createGround(circuit: CircuitSpec) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 430),
    new THREE.MeshStandardMaterial({ color: circuit.palette.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  return ground;
}

function createRoad(circuit: CircuitSpec) {
  const points = sampleCircuit(circuit, 180);
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const point of points) {
    const rightX = Math.cos(point.heading);
    const rightZ = -Math.sin(point.heading);
    const half = circuit.width / 2;
    vertices.push(point.x - rightX * half, 0, point.z - rightZ * half);
    vertices.push(point.x + rightX * half, 0, point.z + rightZ * half);
  }
  for (let index = 0; index < points.length; index++) {
    const next = (index + 1) % points.length;
    const a = index * 2;
    const b = a + 1;
    const c = next * 2;
    const d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: circuit.palette.road,
      roughness: 0.92,
      side: THREE.DoubleSide,
    }),
  );
}

function addEdges(group: THREE.Group, circuit: CircuitSpec) {
  const samples = sampleCircuit(circuit, 84);
  const curbGeometry = new THREE.BoxGeometry(1.2, 0.12, 2.7);
  const barrierGeometry = new THREE.BoxGeometry(0.55, 0.82, 3.1);
  const red = new THREE.MeshStandardMaterial({ color: 0xcf3f48, roughness: 0.82 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf0eee7, roughness: 0.82 });
  for (const side of [-1, 1])
    for (const [index, point] of samples.entries()) {
      const rightX = Math.cos(point.heading);
      const rightZ = -Math.sin(point.heading);
      const curb = new THREE.Mesh(curbGeometry, index % 2 === 0 ? red : white);
      const curbOffset = side * (circuit.width / 2 - 0.35);
      curb.position.set(point.x + rightX * curbOffset, 0.08, point.z + rightZ * curbOffset);
      curb.rotation.y = point.heading;
      group.add(curb);
      if (index % 2 !== 0) continue;
      const barrier = new THREE.Mesh(
        barrierGeometry,
        Math.floor(index / 2) % 2 === 0 ? white : red,
      );
      const barrierOffset = side * (circuit.width / 2 + 1.3);
      barrier.position.set(
        point.x + rightX * barrierOffset,
        0.41,
        point.z + rightZ * barrierOffset,
      );
      barrier.rotation.y = point.heading;
      group.add(barrier);
    }
}

function addStartGrid(group: THREE.Group, circuit: CircuitSpec) {
  const start = sampleCircuit(circuit)[0];
  if (!start) return;
  const rightX = Math.cos(start.heading);
  const rightZ = -Math.sin(start.heading);
  const forwardX = Math.sin(start.heading);
  const forwardZ = Math.cos(start.heading);
  for (let lane = 0; lane < 10; lane++) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.05, circuit.width / 10),
      new THREE.MeshStandardMaterial({
        color: lane % 2 === 0 ? 0xf6f3eb : 0x17191c,
        roughness: 0.9,
      }),
    );
    const lateral = -circuit.width / 2 + circuit.width / 20 + lane * (circuit.width / 10);
    tile.position.set(start.x + rightX * lateral, 0.07, start.z + rightZ * lateral);
    tile.rotation.y = start.heading;
    group.add(tile);
  }
  for (let row = 0; row < 4; row++) {
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xe8e2d4, side: THREE.DoubleSide }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.rotation.z = -start.heading;
    marker.position.set(
      start.x - forwardX * (5 + row * 5.2),
      0.035,
      start.z - forwardZ * (5 + row * 5.2),
    );
    group.add(marker);
  }
}
