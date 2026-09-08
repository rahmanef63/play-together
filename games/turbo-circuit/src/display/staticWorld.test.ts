import * as THREE from "three";
import { expect, it, vi } from "vitest";
import { batchStaticWorld } from "./staticWorld.js";

it("batches repeated scenery while preserving world placement, normals, UVs and shared geometry", () => {
  const root = new THREE.Group(),
    parent = new THREE.Group();
  parent.position.set(4, 0, 10);
  parent.rotation.y = 0.4;
  root.add(parent);
  const geometry = new THREE.BoxGeometry(1, 2, 3);
  const material = new THREE.MeshStandardMaterial();
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = i;
    parent.add(mesh);
  }
  const transparent = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true }));
  root.add(transparent);
  root.updateMatrixWorld(true);
  const before: number[] = [];
  for (const mesh of parent.children as THREE.Mesh[]) {
    const transformed = mesh.geometry.toNonIndexed().applyMatrix4(mesh.matrixWorld);
    before.push(...transformed.getAttribute("position").array);
    transformed.dispose();
  }
  const dispose = vi.spyOn(geometry, "dispose");
  batchStaticWorld(root);
  const batches = root.children.filter(
    (object) => object.name === "static-world-batch",
  ) as THREE.Mesh[];
  expect(batches).toHaveLength(1);
  expect([...batches[0]!.geometry.getAttribute("position").array]).toEqual(before);
  expect(batches[0]!.geometry.getAttribute("uv").count).toBe(12 * 36);
  expect(transparent.parent).toBe(root);
  expect(dispose).not.toHaveBeenCalled();
});
