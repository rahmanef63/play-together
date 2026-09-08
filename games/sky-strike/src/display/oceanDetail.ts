import * as THREE from "three";
export function addOceanDetail(scene: THREE.Scene) {
  const foam = new THREE.MeshBasicMaterial({ color: 0x8cd4df, transparent: true, opacity: 0.3 });
  const line = new THREE.PlaneGeometry(8, 0.35);
  for (let i = 0; i < 110; i++) {
    const streak = new THREE.Mesh(line, foam);
    streak.rotation.x = -Math.PI / 2;
    streak.rotation.z = 0.23;
    streak.position.set(Math.sin(i * 2.39) * 420, 0.05, Math.cos(i * 1.67) * 420);
    scene.add(streak);
  }
  const deck = new THREE.MeshStandardMaterial({ color: 0x667d84, roughness: 0.8 });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xf1c55f });
  const island = new THREE.Group();
  island.position.set(-125, 0, 80);
  island.rotation.y = 0.4;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 68), deck);
  hull.position.y = 2;
  hull.castShadow = true;
  island.add(hull);
  const runway = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 57), yellow);
  runway.position.set(-3, 4.08, 0);
  island.add(runway);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 12), deck);
  tower.position.set(5, 8, -9);
  tower.castShadow = true;
  island.add(tower);
  scene.add(island);
}
