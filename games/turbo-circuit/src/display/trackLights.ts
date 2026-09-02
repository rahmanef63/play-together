import * as THREE from "three";
import type { TrackSpec } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";

export function addTrackLights(group: THREE.Group, track: TrackSpec) {
  const accent = new THREE.MeshBasicMaterial({ color: track.palette.accent }),
    samples = sampleTrack(track, 72),
    stripGeo = new THREE.BoxGeometry(0.1, 0.12, 3.4);
  for (const side of [-1, 1])
    for (const [index, point] of samples.entries()) {
      if (index % 2 !== 0) continue;
      const rx = Math.cos(point.heading),
        rz = -Math.sin(point.heading),
        offset = side * (track.width / 2 + 1.15),
        strip = new THREE.Mesh(stripGeo, accent);
      strip.position.set(point.x + rx * offset, 1.34, point.z + rz * offset);
      strip.rotation.y = point.heading;
      group.add(strip);
    }
  addStartBulbs(group, track, accent);
}
function addStartBulbs(group: THREE.Group, track: TrackSpec, material: THREE.MeshBasicMaterial) {
  const start = sampleTrack(track)[0];
  if (!start) return;
  const bulbs = new THREE.Group(),
    geo = new THREE.SphereGeometry(0.16, 6, 5),
    width = Math.min(track.width, 17);
  for (let index = 0; index < 13; index++) {
    const x = -width / 2 + (width * index) / 12;
    for (const y of [6.05, 8.65]) {
      const bulb = new THREE.Mesh(geo, material);
      bulb.position.set(x, y, 0.36);
      bulbs.add(bulb);
    }
  }
  bulbs.position.set(start.x, 0, start.z);
  bulbs.rotation.y = start.heading;
  group.add(bulbs);
}
