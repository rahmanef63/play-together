import * as THREE from "three";

/** Bake static meshes by material and spatial cell; keep frustum culling local to the road. */
export function batchStaticWorld(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const batches = new Map<string, THREE.Mesh[]>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    if (object.material.transparent || !object.visible) return;
    const p = object.getWorldPosition(new THREE.Vector3());
    const key = [
      object.material.uuid,
      Math.floor(p.x / 64),
      Math.floor(p.z / 64),
      object.castShadow,
      object.receiveShadow,
    ].join(":");
    const batch = batches.get(key) ?? [];
    batch.push(object);
    batches.set(key, batch);
  });
  const removedGeometry = new Set<THREE.BufferGeometry>();
  for (const meshes of batches.values()) {
    const first = meshes[0];
    if (!first || meshes.length < 2) continue;
    const values: Record<string, number[]> = { position: [], normal: [], uv: [] };
    for (const mesh of meshes) {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      for (const name of Object.keys(values)) {
        const attribute = geometry.getAttribute(name);
        const count = geometry.getAttribute("position").count;
        const size = name === "uv" ? 2 : 3;
        const target = values[name]!;
        for (let index = 0; index < count * size; index++)
          target.push(attribute ? attribute.array[index]! : 0);
      }
      geometry.dispose();
      removedGeometry.add(mesh.geometry);
      mesh.removeFromParent();
    }
    const geometry = new THREE.BufferGeometry();
    for (const [name, array] of Object.entries(values))
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(array, name === "uv" ? 2 : 3));
    geometry.computeBoundingSphere();
    const merged = new THREE.Mesh(geometry, first.material);
    merged.name = "static-world-batch";
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    merged.matrixAutoUpdate = false;
    root.add(merged);
  }
  // Shared source geometries may still be used by singleton or transparent meshes.
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) removedGeometry.delete(object.geometry);
  });
  for (const geometry of removedGeometry) geometry.dispose();
}
