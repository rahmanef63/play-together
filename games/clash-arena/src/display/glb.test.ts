import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { expect, it } from "vitest";
import { loadGlbFighter } from "./glb.js";

it("preserves GLB linear material colors instead of applying sRGB decoding twice", async () => {
  const bytes = await readFile(new URL("../../assets/runtime/nova-rin.glb", import.meta.url));
  const model = await loadGlbFighter(new Blob([bytes]));
  let suit: THREE.MeshStandardMaterial | undefined;
  model.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!Array.isArray(mesh.material) && mesh.material?.name === "nova-rin.suit")
      suit = mesh.material as THREE.MeshStandardMaterial;
  });
  expect(suit).toBeDefined();
  const expected = new THREE.Color(0xa51f33);
  expect(suit?.color.r).toBeCloseTo(expected.r, 5);
  expect(suit?.color.g).toBeCloseTo(expected.g, 5);
  expect(suit?.color.b).toBeCloseTo(expected.b, 5);
});
