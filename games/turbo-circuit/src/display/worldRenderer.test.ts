import * as THREE from "three";
import { expect, it, vi } from "vitest";
import { WorldRenderer } from "./worldRenderer.js";

it("removes and releases pickups absent from a new track without removing retained pickups", () => {
  const scene = new THREE.Scene();
  const world = new WorldRenderer(scene);
  const pickup = { id: "old", type: "coin" as const, x: 0, z: 0, active: true, respawnMs: 0 };
  world.sync([pickup, { ...pickup, id: "retained" }], []);
  const group = scene.getObjectByName("kart-world-items")!;
  const old = group.children[0] as THREE.Mesh;
  const retained = group.children[1];
  const release = vi.spyOn(old.geometry, "dispose");
  world.sync([{ ...pickup, id: "retained", x: 20 }], []);
  expect(group.children).toEqual([retained]);
  expect(retained?.position.x).toBe(20);
  expect(release).toHaveBeenCalledTimes(1);
  world.dispose(scene);
  expect(scene.children).toHaveLength(0);
});
it("replaces a reused pickup id when its authoritative type changes", () => {
  const scene = new THREE.Scene();
  const world = new WorldRenderer(scene);
  const pickup = { id: "same", x: 0, z: 0, active: true, respawnMs: 0 };
  world.sync([{ ...pickup, type: "coin" }], []);
  const group = scene.getObjectByName("kart-world-items")!;
  const old = group.children[0];
  world.sync([{ ...pickup, type: "item" }], []);
  expect(group.children).toHaveLength(1);
  expect(group.children[0]).not.toBe(old);
  expect(group.children[0]?.userData.pickupType).toBe("item");
  world.dispose(scene);
});
