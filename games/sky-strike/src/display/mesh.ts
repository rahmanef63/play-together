import * as THREE from "three";
export const standard = (color: number, metalness = 0.2) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.38 });
export const add = (
  g: THREE.Group,
  name: string,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
};
