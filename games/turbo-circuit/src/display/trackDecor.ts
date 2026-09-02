import * as THREE from "three";
import type { TrackSpec } from "../shared/catalog.js";
import { featurePoses, sampleTrack } from "../shared/trackMath.js";
import { canvasTexture } from "./proceduralTextures.js";
import { addTrackLights } from "./trackLights.js";

export function addTrackDecor(group: THREE.Group, track: TrackSpec) {
  addGuardrails(group, track);
  addFinishLine(group, track);
  addStartMarquee(group, track);
  addTrackLights(group, track);
  return addBoostPads(group, track);
}
function addGuardrails(group: THREE.Group, track: TrackSpec) {
  const samples = sampleTrack(track, 86),
    postGeo = new THREE.BoxGeometry(0.34, 1.25, 0.34),
    railGeo = new THREE.BoxGeometry(0.22, 0.22, 3.2),
    tireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.55, 10),
    metal = new THREE.MeshStandardMaterial({ color: 0xa7afb9, metalness: 0.78, roughness: 0.3 }),
    red = new THREE.MeshStandardMaterial({ color: 0xc83d45, roughness: 0.7 }),
    white = new THREE.MeshStandardMaterial({ color: 0xefeee9, roughness: 0.7 });
  tireGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1])
    for (const [index, point] of samples.entries()) {
      const rx = Math.cos(point.heading),
        rz = -Math.sin(point.heading),
        off = side * (track.width / 2 + 1.05),
        x = point.x + rx * off,
        z = point.z + rz * off,
        post = new THREE.Mesh(postGeo, metal),
        rail = new THREE.Mesh(railGeo, metal);
      post.position.set(x, 0.62, z);
      rail.position.set(x, 1.02, z);
      rail.rotation.y = point.heading;
      group.add(post, rail);
      if (index % 5 !== 0) continue;
      for (const y of [0.42, 0.9]) {
        const barrier = new THREE.Mesh(tireGeo, Math.floor(index / 5) % 2 === 0 ? red : white);
        barrier.position.set(x, y, z);
        barrier.rotation.y = point.heading;
        group.add(barrier);
      }
    }
}
function addFinishLine(group: THREE.Group, track: TrackSpec) {
  const start = sampleTrack(track)[0];
  if (!start) return;
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 10; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#f7f5ef" : "#111317";
      ctx.fillRect(col * 32, row * 32, 32, 32);
    }
  const texture = canvasTexture(canvas),
    line = new THREE.Mesh(
      new THREE.PlaneGeometry(track.width - 0.7, 3.3),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = -start.heading;
  line.position.set(start.x, 0.075, start.z);
  group.add(line);
}
function addStartMarquee(group: THREE.Group, track: TrackSpec) {
  const start = sampleTrack(track)[0];
  if (!start) return;
  const arch = new THREE.Group(),
    dark = new THREE.MeshStandardMaterial({ color: 0x202733, metalness: 0.62, roughness: 0.3 }),
    accent = new THREE.MeshStandardMaterial({
      color: track.palette.accent,
      metalness: 0.45,
      roughness: 0.28,
    }),
    pillarGeo = new THREE.CylinderGeometry(0.52, 0.68, 9.5, 10);
  for (const x of [-track.width / 2 - 1.2, track.width / 2 + 1.2]) {
    const pillar = new THREE.Mesh(pillarGeo, dark);
    pillar.position.set(x, 4.75, 0);
    arch.add(pillar);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(track.width + 4, 0.62, 0.75), dark);
  beam.position.set(0, 8.7, 0);
  arch.add(beam);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(track.width + 1, 18), 3.6, 0.58),
    accent,
  );
  board.position.set(0, 7.35, 0);
  arch.add(board, marqueeFace(track));
  arch.position.set(start.x, 0, start.z);
  arch.rotation.y = start.heading;
  group.add(arch);
}
function marqueeFace(track: TrackSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Group();
  ctx.fillStyle = "#12151b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = `#${track.palette.accent.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 12;
  ctx.strokeRect(8, 8, 752, 164);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f6f0df";
  ctx.font = "900 70px system-ui, sans-serif";
  ctx.fillText("TURBO CIRCUIT", 384, 108);
  ctx.fillStyle = "#aeb8c4";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText(track.shortName.toUpperCase(), 384, 148);
  const texture = canvasTexture(canvas),
    face = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(track.width, 17), 3.1),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
  face.position.set(0, 7.35, 0.31);
  return face;
}
function addBoostPads(group: THREE.Group, track: TrackSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, 160, 160);
    ctx.fillStyle = `#${track.palette.accent.toString(16).padStart(6, "0")}`;
    for (const y of [18, 66, 114]) {
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(142, y + 28);
      ctx.lineTo(122, y + 38);
      ctx.lineTo(80, y + 19);
      ctx.lineTo(38, y + 38);
      ctx.lineTo(18, y + 28);
      ctx.closePath();
      ctx.fill();
    }
  }
  const material = new THREE.MeshBasicMaterial({
    map: canvasTexture(canvas),
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  for (const pad of featurePoses(track, track.features.boostPads, [0])) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 4.8), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -pad.heading;
    mesh.position.set(pad.x, 0.085, pad.z);
    group.add(mesh);
  }
  return material;
}
