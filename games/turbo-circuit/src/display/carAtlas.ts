import * as THREE from "three";
import type { RacerPose } from "./model.js";

export type CarViewName =
  | "front"
  | "front_right"
  | "right"
  | "rear_right"
  | "rear"
  | "rear_left"
  | "left"
  | "front_left";
export interface CarAtlasMeta {
  image: string;
  frameWidth: number;
  frameHeight: number;
  frames: Record<CarViewName, { x: number; y: number; width: number; height: number }>;
}
export interface CarVisual {
  root: THREE.Group;
  fallback: THREE.Group;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  view: CarViewName;
}
export const CAR_VIEWS: CarViewName[] = [
  "front",
  "front_right",
  "right",
  "rear_right",
  "rear",
  "rear_left",
  "left",
  "front_left",
];

export function parseCarAtlas(value: unknown): CarAtlasMeta {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid vehicle atlas metadata");
  const candidate = value as Partial<CarAtlasMeta>;
  if (
    !candidate.frames ||
    typeof candidate.frameWidth !== "number" ||
    typeof candidate.frameHeight !== "number"
  )
    throw new Error("Vehicle atlas metadata is incomplete");
  for (const name of CAR_VIEWS) {
    const frame = candidate.frames[name];
    if (!frame || ![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite))
      throw new Error(`Vehicle atlas frame is missing: ${name}`);
  }
  return candidate as CarAtlasMeta;
}
export function carViewForCamera(camera: THREE.Vector3, pose: RacerPose): CarViewName {
  const dx = camera.x - pose.x;
  const dz = camera.z - pose.z;
  const length = Math.hypot(dx, dz) || 1;
  const vx = dx / length;
  const vz = dz / length;
  const forward = vx * Math.sin(pose.heading) + vz * Math.cos(pose.heading);
  const right = vx * Math.cos(pose.heading) - vz * Math.sin(pose.heading);
  const sector = ((Math.round(Math.atan2(right, forward) / (Math.PI / 4)) % 8) + 8) % 8;
  return CAR_VIEWS[sector] ?? "rear";
}
export function carMesh(color: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.7, 4.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 }),
  );
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.6, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.15, metalness: 0.5 }),
  );
  cabin.position.set(0, 1.15, -0.25);
  group.add(cabin);
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.12, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x0b0f19 }),
  );
  spoiler.position.set(0, 0.95, -1.75);
  group.add(spoiler);
  return group;
}
