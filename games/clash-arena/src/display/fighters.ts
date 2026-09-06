import * as THREE from "three";
import type { ViewFighter } from "./model.js";
export type FighterVisual = THREE.Group & {
  limbs: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  torso: THREE.Group;
  aura: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
};
const limb = (mat: THREE.Material, x: number, y: number, length: number, thick: number) => {
  const pivot = new THREE.Group(),
    joint = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(thick, length * 0.36, 5, 8), mat);
  upper.position.y = -length * 0.26;
  upper.castShadow = true;
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(thick * 1.12, 8, 6), mat);
  elbow.position.y = -length * 0.51;
  elbow.castShadow = true;
  const lower = new THREE.Mesh(new THREE.CapsuleGeometry(thick * 0.86, length * 0.3, 5, 8), mat);
  lower.position.y = -length * 0.72;
  lower.castShadow = true;
  joint.add(upper, elbow, lower);
  pivot.position.set(x, y, 0);
  pivot.add(joint);
  return pivot;
};
export function fighterMesh(color: number): FighterVisual {
  const g = new THREE.Group() as FighterVisual,
    suit = new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.26 }),
    dark = new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.55 }),
    skin = new THREE.MeshStandardMaterial({ color: 0xf1b58d, roughness: 0.6 });
  const torso = new THREE.Group(),
    chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.39, 0.66, 6, 12), suit),
    head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), skin);
  chest.castShadow = head.castShadow = true;
  chest.position.y = 0.34;
  head.position.y = 1.08;
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.34, 10), dark);
  waist.position.y = -0.18;
  waist.castShadow = true;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 6, 14), dark);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.78;
  torso.add(chest, head, waist, collar);
  torso.position.y = 0.82;
  const limbs: FighterVisual["limbs"] = [
    limb(suit, -0.46, 1.52, 0.82, 0.12),
    limb(suit, 0.46, 1.52, 0.82, 0.12),
    limb(dark, -0.23, 0.88, 1.0, 0.14),
    limb(dark, 0.23, 0.88, 1.0, 0.14),
  ];
  const aura = new THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>(
    new THREE.RingGeometry(0.48, 0.62, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.04;
  g.add(torso, ...limbs, aura);
  g.limbs = limbs;
  g.torso = torso;
  g.aura = aura;
  return g;
}
export function pose(m: FighterVisual, f: ViewFighter, dt: number) {
  const phase = Math.min(1, (f.moveFrame ?? 0) / 18),
    attack = f.move ?? "",
    guard = !attack && (f.blockStun > 0 || f.flash === "BLOCK");
  const target = new THREE.Vector3(
    f.x,
    f.airborne ? 1.05 + Math.sin(Math.min(1, f.airborne / 38) * Math.PI) * 0.45 : 0.25,
    f.lane * 0.8,
  );
  m.position.lerp(target, Math.min(1, dt * 12));
  m.rotation.y = f.side ? Math.PI / 2 : -Math.PI / 2;
  const [la, ra, ll, rl] = m.limbs,
    kick = attack === "kick" || attack === "sweep",
    launch = attack === "launcher" || attack === "special";
  la.rotation.set(
    guard ? -0.9 : attack && !kick ? -1.55 * Math.sin(phase * Math.PI) : 0.16,
    0,
    guard ? 0.65 : 0.12,
  );
  ra.rotation.set(
    guard ? -0.9 : attack && !kick ? -0.45 + 1.45 * Math.sin(phase * Math.PI) : -0.16,
    0,
    guard ? -0.65 : -0.12,
  );
  ll.rotation.set(kick ? 0.35 + 1.4 * Math.sin(phase * Math.PI) : 0.08, 0, 0);
  rl.rotation.set(kick ? -0.18 : -0.08, 0, 0);
  m.torso.rotation.set(
    f.stun ? 0.22 * Math.sin((f.stun ?? 0) * 1.7) : launch ? -0.16 : guard ? 0.08 : 0,
    0,
    kick ? -0.12 : 0,
  );
  const hit = f.stun > 0 || Boolean(f.flash && f.flash !== "BLOCK");
  m.aura.material.opacity = hit ? 0.55 : f.airborne ? 0.25 : 0;
  m.aura.scale.setScalar(hit ? 1.25 : 0.8);
  m.scale.setScalar(f.stun ? 1.08 : 1.14);
}
