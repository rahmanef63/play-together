import * as THREE from "three";
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}
