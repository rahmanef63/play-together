import { fighterAnimations } from "./character-animations.mjs";
import {
  attach,
  box,
  capsule,
  cone,
  cylinder,
  joint,
  material,
  sphere,
  torus,
} from "./character-primitives.mjs";

export function buildFighter(spec) {
  const root = joint("root", [0, 0, 0]),
    hips = joint("hips", [0, 0.92, 0]);
  root.add(hips);
  const skin = material(`${spec.id}.skin`, spec.skin, 0.74, 0),
    suit = material(`${spec.id}.suit`, spec.primary, 0.38, 0.18),
    dark = material(`${spec.id}.dark`, spec.dark, 0.58, 0.08),
    accent = material(`${spec.id}.accent`, spec.accent, 0.3, 0.48),
    hair = material(`${spec.id}.hair`, spec.hair, 0.72, 0.02);
  const spine = joint("spine", [0, 0.25, 0]),
    chest = joint("chest", [0, 0.42, 0]);
  hips.add(spine);
  spine.add(chest);
  attach(hips, box(0.54 * spec.bulk, 0.3, 0.3, dark), [0, 0.03, 0]);
  attach(spine, capsule(0.28 * spec.bulk, 0.45, suit), [0, 0.2, 0]);
  attach(chest, capsule(0.35 * spec.bulk, 0.48, suit), [0, 0.23, 0]);
  if (spec.armor) {
    attach(chest, box(0.78 * spec.bulk, 0.18, 0.42, accent), [0, 0.42, -0.01]);
    attach(chest, box(0.22, 0.28, 0.14, accent), [-0.42 * spec.bulk, 0.38, 0]);
    attach(chest, box(0.22, 0.28, 0.14, accent), [0.42 * spec.bulk, 0.38, 0]);
  }
  const neck = joint("neck", [0, 0.53, 0]),
    head = joint("head", [0, 0.18, 0]);
  chest.add(neck);
  neck.add(head);
  attach(neck, cylinder(0.09, 0.13, skin), [0, 0.03, 0]);
  attach(head, sphere(0.23 * spec.headScale, skin), [0, 0.12, 0]);
  addHair(head, hair, spec);
  addFaceGuard(head, accent, spec);
  addArm(chest, "L", -1, spec, skin, suit, accent);
  addArm(chest, "R", 1, spec, skin, suit, accent);
  addLeg(hips, "L", -1, spec, dark, accent);
  addLeg(hips, "R", 1, spec, dark, accent);
  addSignatureParts(hips, chest, spec, accent, dark);
  root.userData.characterId = spec.id;
  root.userData.rig = "pt-humanoid-v1";
  return { root, animations: fighterAnimations(spec) };
}

function addArm(chest, side, sign, spec, skin, suit, accent) {
  const shoulder = joint(`shoulder.${side}`, [sign * 0.4 * spec.bulk, 0.42, 0]),
    upper = joint(`upper_arm.${side}`, [sign * 0.07, 0, 0]),
    fore = joint(`forearm.${side}`, [0, -0.39 * spec.armScale, 0]),
    hand = joint(`hand.${side}`, [0, -0.34 * spec.armScale, 0]);
  chest.add(shoulder);
  shoulder.add(upper);
  upper.add(fore);
  fore.add(hand);
  attach(upper, capsule(0.095 * spec.bulk, 0.32 * spec.armScale, suit), [0, -0.2, 0]);
  attach(fore, capsule(0.085 * spec.bulk, 0.28 * spec.armScale, skin), [0, -0.17, 0]);
  const glove = spec.armor ? box(0.23, 0.27, 0.24, accent) : sphere(0.13, accent);
  attach(hand, glove, [0, -0.06, 0]);
  if (spec.armor) attach(fore, box(0.2, 0.24, 0.2, accent), [0, -0.12, 0]);
  shoulder.rotation.z = sign * 0.15;
  return { shoulder, upper, fore, hand };
}

function addLeg(hips, side, sign, spec, dark, accent) {
  const thigh = joint(`thigh.${side}`, [sign * 0.18 * spec.bulk, -0.08, 0]),
    shin = joint(`shin.${side}`, [0, -0.48 * spec.legScale, 0]),
    foot = joint(`foot.${side}`, [0, -0.46 * spec.legScale, 0.07]);
  hips.add(thigh);
  thigh.add(shin);
  shin.add(foot);
  attach(thigh, capsule(0.13 * spec.bulk, 0.4 * spec.legScale, dark), [0, -0.24, 0]);
  attach(shin, capsule(0.11 * spec.bulk, 0.36 * spec.legScale, dark), [0, -0.22, 0]);
  attach(foot, box(0.22 * spec.bulk, 0.13, 0.38, accent), [0, -0.08, 0.09]);
  return { thigh, shin, foot };
}

function addHair(head, mat, spec) {
  attach(head, sphere(0.24 * spec.headScale, mat, 10, 8, [1, 0.68, 1]), [0, 0.2, 0]);
  if (spec.id === "nova-rin") {
    for (const [x, z, rz] of [
      [-0.15, -0.02, -0.35],
      [0.14, 0, 0.32],
      [-0.04, -0.12, -0.12],
    ]) {
      const strand = cone(0.065, 0.28, mat);
      strand.rotation.z = rz;
      attach(head, strand, [x, 0.18, z]);
    }
  }
}
function addFaceGuard(head, mat, spec) {
  if (!spec.armor) return;
  attach(head, box(0.34, 0.08, 0.18, mat), [0, 0.06, 0.18]);
}
function addSignatureParts(hips, chest, spec, accent, dark) {
  if (spec.id === "nova-rin") {
    const sash = box(0.08, 0.62, 0.05, accent);
    sash.rotation.z = 0.38;
    attach(hips, sash, [-0.25, -0.14, -0.08]);
    const sash2 = sash.clone();
    sash2.rotation.z = -0.28;
    attach(hips, sash2, [-0.12, -0.18, -0.1]);
  } else {
    attach(chest, torus(0.38, 0.035, accent), [0, 0.32, 0.2], [Math.PI / 2, 0, 0]);
    attach(hips, box(0.64, 0.18, 0.36, dark), [0, -0.1, 0]);
  }
}
