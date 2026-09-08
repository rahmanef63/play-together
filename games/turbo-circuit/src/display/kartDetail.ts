import * as THREE from "three";
export function addKartDetail(body: THREE.Group, width: number, length: number) {
  const trim = new THREE.MeshStandardMaterial({
    color: 0xf6edce,
    roughness: 0.45,
    metalness: 0.35,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9ae7ff,
    emissive: 0x3b7086,
    emissiveIntensity: 0.4,
    roughness: 0.12,
  });
  for (const x of [-0.18, 0.18]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, length * 0.34), trim);
    stripe.position.set(x, 0.973, length * 0.31);
    body.add(stripe);
  }
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.11), glass);
    lamp.position.set(side * width * 0.34, 0.62, length * 0.51);
    body.add(lamp);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.84), trim);
    cap.position.set((side * (width + 0.45)) / 2, 1.4, -length * 0.45);
    body.add(cap);
  }
}
