import * as THREE from "three";
export function createArena() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b18);
  scene.fog = new THREE.Fog(0x080b18, 10, 30);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
  camera.position.set(0, 7, 13);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  scene.add(new THREE.HemisphereLight(0x8cc8ff, 0x16081b, 2));
  const key = new THREE.DirectionalLight(0xffb35c, 3);
  key.position.set(-5, 8, 5);
  key.castShadow = true;
  scene.add(key);
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.7, 7.7, 0.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x1c2541, metalness: 0.45, roughness: 0.38 }),
  );
  floor.receiveShadow = true;
  scene.add(floor);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.06, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x5eead4 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.28;
  scene.add(ring);
  for (let i = 0; i < 12; i++) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 3, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x26365e, emissive: 0x101c3c }),
    );
    const a = (i * Math.PI) / 6;
    pillar.position.set(Math.cos(a) * 6, 1.5, Math.sin(a) * 6);
    scene.add(pillar);
  }
  return { scene, camera, renderer };
}
