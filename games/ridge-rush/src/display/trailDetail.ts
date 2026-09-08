import * as THREE from "three";
import { CHECKPOINTS, centerLine, courseElevation, FINISH_PROGRESS } from "../shared/course.js";
export function addTrailDetail(scene: THREE.Scene) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x574434, roughness: 0.9 });
  const sign = new THREE.MeshStandardMaterial({ color: 0xe9b153, roughness: 0.6 });
  for (const progress of CHECKPOINTS)
    for (const side of [-1, 1]) {
      const x = centerLine(progress) + side * 5.2,
        y = courseElevation(progress);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2, 6), wood);
      post.position.set(x, y + 1, progress);
      scene.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.12), sign);
      board.position.set(x, y + 1.7, progress);
      scene.add(board);
    }
  const black = new THREE.MeshBasicMaterial({ color: 0x13202a }),
    white = new THREE.MeshBasicMaterial({ color: 0xf2eee5 });
  for (let i = 0; i < 14; i++) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.24), i % 2 ? white : black);
    cell.position.set(
      centerLine(FINISH_PROGRESS) - 3.51 + i * 0.54,
      courseElevation(FINISH_PROGRESS) + 3.8,
      FINISH_PROGRESS,
    );
    scene.add(cell);
  }
}
