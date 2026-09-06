import * as THREE from "three";
import { type LoadedFighter, loadGlbFighter } from "./glb.js";
import type { ViewFighter } from "./model.js";

export type FighterVisual = LoadedFighter & {
  aura: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
};
export async function fighterAsset(blob: Blob): Promise<FighterVisual> {
  const model = (await loadGlbFighter(blob)) as FighterVisual;
  for (const name of ["hips", "chest", "upper_arm.L", "upper_arm.R", "thigh.L", "thigh.R"])
    if (!model.rig.has(name)) throw new Error(`Fighter GLB is missing rig node ${name}`);
  const aura = new THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>(
    new THREE.RingGeometry(0.48, 0.62, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.04;
  model.add(aura);
  model.aura = aura;
  model.scale.setScalar(1.04);
  return model;
}
export function pose(m: FighterVisual, f: ViewFighter, dt: number) {
  const phase = Math.min(1, (f.moveFrame ?? 0) / 18),
    attack = f.move ?? "",
    guard = !attack && (f.blockStun > 0 || f.flash === "BLOCK"),
    target = new THREE.Vector3(
      f.x,
      f.airborne ? 1.05 + Math.sin(Math.min(1, f.airborne / 38) * Math.PI) * 0.45 : 0.25,
      f.lane * 0.8,
    );
  m.position.lerp(target, Math.min(1, dt * 12));
  m.rotation.y = f.side ? Math.PI / 2 : -Math.PI / 2;
  const la = rig(m, "upper_arm.L"),
    ra = rig(m, "upper_arm.R"),
    ll = rig(m, "thigh.L"),
    rl = rig(m, "thigh.R"),
    chest = rig(m, "chest"),
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
  chest.rotation.set(
    f.stun ? 0.22 * Math.sin((f.stun ?? 0) * 1.7) : launch ? -0.16 : guard ? 0.08 : 0,
    0,
    kick ? -0.12 : 0,
  );
  const hit = f.stun > 0 || Boolean(f.flash && f.flash !== "BLOCK");
  m.aura.material.color.setHex(f.side ? 0x65d6ff : 0xff5b7d);
  m.aura.material.opacity = hit ? 0.55 : f.airborne ? 0.25 : 0;
  m.aura.scale.setScalar(hit ? 1.25 : 0.8);
  m.scale.setScalar(f.stun ? 1.1 : 1.04);
}
function rig(model: FighterVisual, name: string): THREE.Object3D {
  const node = model.rig.get(name);
  if (!node) throw new Error(`Fighter rig node vanished: ${name}`);
  return node;
}
