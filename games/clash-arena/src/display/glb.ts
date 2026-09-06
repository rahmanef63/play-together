import * as THREE from "three";
import { type AccessorJson, readAccessor } from "./glb-accessor.js";

interface GltfNode {
  name?: string;
  mesh?: number;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}
interface GltfPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
}
interface GltfJson extends AccessorJson {
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
  nodes?: GltfNode[];
  meshes?: Array<{ primitives: GltfPrimitive[] }>;
  materials?: Array<{
    name?: string;
    pbrMetallicRoughness?: {
      baseColorFactor?: number[];
      metallicFactor?: number;
      roughnessFactor?: number;
    };
    emissiveFactor?: number[];
    doubleSided?: boolean;
  }>;
  bufferViews?: Array<{ byteOffset?: number; byteLength: number; byteStride?: number }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
  }>;
  animations?: Array<{ name?: string }>;
}
export type LoadedFighter = THREE.Group & {
  rig: Map<string, THREE.Object3D>;
  animationNames: string[];
};

export async function loadGlbFighter(blob: Blob): Promise<LoadedFighter> {
  const bytes = await blob.arrayBuffer(),
    view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2)
    throw new Error("Invalid GLB");
  let offset = 12,
    json: GltfJson | null = null,
    bin: ArrayBuffer | null = null;
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true),
      start = offset + 8;
    if (type === 0x4e4f534a)
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, start, length)).trim());
    if (type === 0x004e4942) bin = bytes.slice(start, start + length);
    offset = start + length;
  }
  if (!json || !bin) throw new Error("GLB is missing JSON or binary chunk");
  return build(json, bin);
}

function build(json: GltfJson, bin: ArrayBuffer): LoadedFighter {
  const nodes = (json.nodes ?? []).map((entry) => {
    const group = new THREE.Group();
    group.name = entry.name ?? "";
    if (entry.translation)
      group.position.set(
        entry.translation[0] ?? 0,
        entry.translation[1] ?? 0,
        entry.translation[2] ?? 0,
      );
    if (entry.rotation)
      group.quaternion.set(
        entry.rotation[0] ?? 0,
        entry.rotation[1] ?? 0,
        entry.rotation[2] ?? 0,
        entry.rotation[3] ?? 1,
      );
    if (entry.scale) group.scale.set(entry.scale[0] ?? 1, entry.scale[1] ?? 1, entry.scale[2] ?? 1);
    return group;
  });
  const materials = (json.materials ?? []).map(materialFrom);
  for (let i = 0; i < nodes.length; i++) {
    const entry = json.nodes?.[i],
      node = nodes[i];
    if (!entry || !node) continue;
    if (entry.mesh !== undefined)
      for (const mesh of meshesFor(json, bin, entry.mesh, materials)) node.add(mesh);
    for (const child of entry.children ?? []) {
      const childNode = nodes[child];
      if (childNode) node.add(childNode);
    }
  }
  const scene = new THREE.Group() as LoadedFighter;
  scene.name = "fighter-asset";
  const sceneEntry = json.scenes?.[json.scene ?? 0] ?? json.scenes?.[0];
  for (const root of sceneEntry?.nodes ?? [0]) {
    const rootNode = nodes[root];
    if (rootNode) scene.add(rootNode);
  }
  const rig = new Map<string, THREE.Object3D>();
  scene.traverse((node) => {
    if (node.name) rig.set(node.name, node);
  });
  scene.rig = rig;
  scene.animationNames = (json.animations ?? [])
    .map((animation) => animation.name ?? "")
    .filter(Boolean);
  return scene;
}

function meshesFor(
  json: GltfJson,
  bin: ArrayBuffer,
  meshIndex: number,
  materials: THREE.Material[],
) {
  const mesh = json.meshes?.[meshIndex];
  if (!mesh) return [];
  return mesh.primitives.map((primitive) => {
    const geometry = new THREE.BufferGeometry(),
      position = readAccessor(json, bin, primitive.attributes.POSITION),
      normal = readAccessor(json, bin, primitive.attributes.NORMAL);
    if (!position) throw new Error("GLB primitive is missing POSITION");
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(position.values as Float32Array, position.size),
    );
    if (normal)
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(normal.values as Float32Array, normal.size),
      );
    const indices =
      primitive.indices === undefined ? null : readAccessor(json, bin, primitive.indices);
    if (indices) geometry.setIndex(Array.from(indices.values as Uint16Array | Uint32Array));
    const output = new THREE.Mesh(
      geometry,
      materials[primitive.material ?? -1] ?? new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }),
    );
    output.castShadow = output.receiveShadow = true;
    return output;
  });
}
function materialFrom(entry: NonNullable<GltfJson["materials"]>[number]) {
  const pbr = entry.pbrMetallicRoughness ?? {},
    base = pbr.baseColorFactor ?? [1, 1, 1, 1];
  const color =
    ((Math.round((base[0] ?? 1) * 255) << 16) |
      (Math.round((base[1] ?? 1) * 255) << 8) |
      Math.round((base[2] ?? 1) * 255)) >>>
    0;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: pbr.roughnessFactor ?? 1,
    metalness: pbr.metallicFactor ?? 0,
    transparent: (base[3] ?? 1) < 1,
    opacity: base[3] ?? 1,
    ...(entry.doubleSided ? { side: THREE.DoubleSide } : {}),
  });
}
