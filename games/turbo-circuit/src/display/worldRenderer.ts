import { disposeSceneResources } from "@play-together/game-sdk";
import * as THREE from "three";
import type { Pickup, WorldItem } from "./model.js";
export class WorldRenderer {
  readonly #group = new THREE.Group();
  readonly #pickups = new Map<string, THREE.Group | THREE.Mesh>();
  readonly #items = new Map<string, THREE.Group | THREE.Mesh>();
  constructor(scene: THREE.Scene) {
    this.#group.name = "kart-world-items";
    scene.add(this.#group);
  }
  sync(pickups: Pickup[], items: WorldItem[]) {
    const present = new Set(pickups.map((pickup) => pickup.id));
    for (const [id, mesh] of this.#pickups) {
      if (present.has(id)) continue;
      mesh.removeFromParent();
      disposeSceneResources(mesh);
      this.#pickups.delete(id);
    }
    for (const pickup of pickups) {
      let mesh = this.#pickups.get(pickup.id);
      if (mesh && mesh.userData.pickupType !== pickup.type) {
        mesh.removeFromParent();
        disposeSceneResources(mesh);
        mesh = undefined;
      }
      if (!mesh) {
        mesh = pickup.type === "coin" ? coinMesh() : boxMesh();
        mesh.userData.pickupType = pickup.type;
        this.#pickups.set(pickup.id, mesh);
        this.#group.add(mesh);
      }
      mesh.position.set(pickup.x, pickup.type === "coin" ? 1.15 : 1.55, pickup.z);
      mesh.visible = pickup.active;
    }
    for (const item of items) {
      let mesh = this.#items.get(item.id);
      if (!mesh) {
        mesh = item.type === "pulse" ? pulseMesh() : mineMesh();
        this.#items.set(item.id, mesh);
        this.#group.add(mesh);
      }
      mesh.position.set(item.x, item.type === "pulse" ? 0.72 : 0.5, item.z);
    }
    for (const [id, mesh] of this.#items) {
      if (items.some((item) => item.id === id)) continue;
      this.#group.remove(mesh);
      disposeSceneResources(mesh);
      this.#items.delete(id);
    }
  }
  dispose(scene: THREE.Scene) {
    scene.remove(this.#group);
    for (const object of [...this.#pickups.values(), ...this.#items.values()])
      disposeSceneResources(object);
    this.#pickups.clear();
    this.#items.clear();
  }
}
function coinMesh() {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.18, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffc928,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x6a4700,
      emissiveIntensity: 0.3,
    }),
  );
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}
function boxMesh() {
  const group = new THREE.Group(),
    outer = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.9, 1.9),
      new THREE.MeshStandardMaterial({
        color: 0x57dffc,
        transparent: true,
        opacity: 0.7,
        metalness: 0.58,
        roughness: 0.14,
      }),
    ),
    core = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
  outer.rotation.set(0.25, 0, 0.25);
  group.add(outer, core);
  return group;
}
function pulseMesh() {
  const group = new THREE.Group(),
    core = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x62e6ff }),
    ),
    ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.08, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.82 }),
    );
  ring.rotation.x = Math.PI / 2;
  group.add(core, ring);
  return group;
}
function mineMesh() {
  const group = new THREE.Group(),
    body = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 10, 7),
      new THREE.MeshStandardMaterial({ color: 0x25272d, roughness: 0.65 }),
    );
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.55, 5),
      new THREE.MeshStandardMaterial({ color: 0xff7043 }),
    );
    spike.position.set(Math.cos(i * 1.047) * 0.72, 0.2, Math.sin(i * 1.047) * 0.72);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = -i * 1.047;
    group.add(spike);
  }
  group.add(body);
  return group;
}
