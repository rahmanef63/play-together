import * as THREE from "three";
import type { TrackSpec } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";
export function addTrackEnvironment(group: THREE.Group, track: TrackSpec) {
  if (track.theme === "metro") addMetro(group);
  else if (track.theme === "cosmic") addCosmic(group, track);
  else addDunes(group, track);
}
function addMetro(group: THREE.Group) {
  const colors = [0x172033, 0x101827, 0x24143c, 0x132a35];
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2,
      r = 88 + (i % 5) * 7,
      h = 13 + (i % 7) * 4;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(7 + (i % 3) * 2, h, 7 + (i % 4)),
      new THREE.MeshStandardMaterial({
        color: colors[i % colors.length] ?? 0x172033,
        roughness: 0.55,
        metalness: 0.18,
      }),
    );
    box.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    group.add(box);
    if (i % 2 === 0) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 1.8),
        new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0x21d4fd : 0xff4fd8 }),
      );
      sign.position.set(box.position.x, h * 0.65, box.position.z + 4.1);
      group.add(sign);
    }
  }
}
function addCosmic(group: THREE.Group, track: TrackSpec) {
  const starGeo = new THREE.SphereGeometry(0.28, 5, 5),
    starMat = new THREE.MeshBasicMaterial({ color: 0xf4edff });
  for (let i = 0; i < 90; i++) {
    const star = new THREE.Mesh(starGeo, starMat);
    const a = i * 0.73,
      r = 82 + (i % 11) * 8;
    star.position.set(Math.cos(a) * r, 12 + (i % 13) * 3, Math.sin(a) * r);
    group.add(star);
  }
  for (const [i, p] of sampleTrack(track, 18).entries()) {
    if (i % 3 !== 0) continue;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.35, 7, 20),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x8b5cf6 : 0xff4fd8 }),
    );
    ring.position.set(p.x, 7, p.z);
    ring.rotation.y = p.heading;
    group.add(ring);
  }
}
function addDunes(group: THREE.Group, track: TrackSpec) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x65402b, roughness: 1 }),
    leafMat = new THREE.MeshStandardMaterial({ color: 0x426a3d, roughness: 1 }),
    rockMat = new THREE.MeshStandardMaterial({ color: 0x8b684e, roughness: 1 });
  for (const [i, p] of sampleTrack(track, 28).entries()) {
    const side = i % 2 === 0 ? -1 : 1,
      rx = Math.cos(p.heading),
      rz = -Math.sin(p.heading),
      d = track.width / 2 + 12 + (i % 4) * 2,
      x = p.x + rx * d * side,
      z = p.z + rz * d * side;
    if (i % 3 === 0) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 4, 6), trunkMat);
      trunk.position.set(x, 2, z);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 7, 5), leafMat);
      crown.scale.set(1.7, 0.45, 1.1);
      crown.position.set(x, 4.8, z);
      group.add(trunk, crown);
    } else {
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(1.8 + (i % 3) * 0.35, 1.3 + (i % 2) * 0.4, 1.6 + (i % 3) * 0.3),
        rockMat,
      );
      rock.position.set(x, 1, z);
      group.add(rock);
    }
  }
}
