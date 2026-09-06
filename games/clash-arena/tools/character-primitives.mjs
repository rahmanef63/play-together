import * as THREE from "three";
export function joint(name, p) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...p);
  return g;
}
export function material(name, color, roughness, metalness) {
  const m = new THREE.MeshStandardMaterial({ name, color, roughness, metalness });
  m.name = name;
  return m;
}
export function attach(parent, mesh, pos, rot = [0, 0, 0]) {
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export const box = (x, y, z, m) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z, 2, 2, 2), m);
export const capsule = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 5, 8), m);
export function sphere(r, m, w = 12, h = 8, scale) {
  const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);
  if (scale) x.scale.set(...scale);
  return x;
}
export const cylinder = (r, h, m) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), m);
export const cone = (r, h, m) => new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), m);
export const torus = (r, t, m) => new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 18), m);
