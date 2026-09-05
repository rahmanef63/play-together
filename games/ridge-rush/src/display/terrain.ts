import * as THREE from "three";
import {
  COURSE_LENGTH,
  centerLine,
  courseCrossSlope,
  courseElevation,
  courseSurface,
} from "../shared/course.js";
import { terrainColor, terrainHeight } from "../shared/terrain.js";

const OFFSETS = [-100, -64, -38, -22, -12, -7, -4.8, 4.8, 7, 12, 22, 38, 64, 100] as const;
export function addMountainTerrain(scene: THREE.Scene): void {
  for (const [start, end] of [
    [0, 520],
    [520, 920],
    [920, 1290],
    [1290, 1740],
    [1740, 2050],
    [2050, 2470],
    [2470, 2780],
    [2780, COURSE_LENGTH],
  ] as const) {
    scene.add(terrainSegment(start, end, terrainColor((start + end) / 2)));
  }
}
function terrainSegment(start: number, end: number, color: number): THREE.Mesh {
  const vertices: number[] = [],
    indices: number[] = [],
    step = 18;
  let row = 0;
  for (let p = start; p <= end + 0.1; p = Math.min(end, p + step)) {
    for (const offset of OFFSETS) {
      const x = centerLine(p) + offset;
      vertices.push(x, terrainHeight(p, x), p);
    }
    if (row > 0) {
      const columns = OFFSETS.length;
      for (let c = 1; c < columns; c += 1) {
        const a = (row - 1) * columns + c - 1,
          b = a + 1,
          d = row * columns + c - 1,
          e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    row += 1;
    if (p === end) break;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: false }),
  );
}
export function trailRibbon(
  width: number,
  start: number,
  end: number,
  color: number,
  offset = 0,
): THREE.Mesh {
  const vertices: number[] = [],
    indices: number[] = [],
    step = 7;
  let row = 0;
  for (let p = start; p <= end + 0.1; p = Math.min(end, p + step)) {
    const center = centerLine(p) + offset;
    const base = courseElevation(p) + 0.035;
    const camber = courseCrossSlope(p);
    vertices.push(
      center - width / 2,
      base - (width / 2) * camber,
      p,
      center + width / 2,
      base + (width / 2) * camber,
      p,
    );
    if (row > 0) {
      const a = row * 2;
      indices.push(a - 2, a, a - 1, a, a + 1, a - 1);
    }
    row += 1;
    if (p === end) break;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
}
export function trailColor(progress: number): number {
  const surface = courseSurface(progress);
  return surface === "snow"
    ? 0xb7c0bf
    : surface === "rock"
      ? 0x6b625b
      : surface === "mud"
        ? 0x4f3926
        : 0x765139;
}
