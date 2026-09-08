import * as THREE from "three";
import type { TrackSpec } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
export function addTrackSigns(group: THREE.Group, track: TrackSpec) {
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x293444,
    roughness: 0.65,
    metalness: 0.4,
  });
  const signMat = new THREE.MeshBasicMaterial({ color: track.palette.accent });
  const samples = sampleTrack(track, 24);
  for (const [i, p] of samples.entries()) {
    if (i % 3) continue;
    const sign = new THREE.Group();
    sign.position.set(
      p.x + Math.cos(p.heading) * (track.width / 2 + 2.3),
      0,
      p.z - Math.sin(p.heading) * (track.width / 2 + 2.3),
    );
    sign.rotation.y = p.heading;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), poleMat);
    post.position.y = 1.25;
    sign.add(post);
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.08), signMat);
      bar.position.set(side * 0.18, 2.1, 0);
      bar.rotation.z = side * 0.55;
      sign.add(bar);
    }
    group.add(sign);
  }
}
