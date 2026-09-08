import { attach, box, sphere } from "./character-primitives.mjs";
export function addFighterDetail(head, chest, hips, spec, dark, accent, skin) {
  for (const side of [-1, 1]) {
    attach(head, sphere(0.035, dark, 8, 6), [side * 0.085, 0.14, 0.208]);
    attach(head, sphere(0.047, skin, 8, 6), [side * 0.225, 0.11, 0]);
    const brow = box(0.1, 0.022, 0.028, dark);
    brow.rotation.z = side * 0.13;
    attach(head, brow, [side * 0.083, 0.191, 0.2], [0, 0, side * 0.13]);
    const piping = box(0.055, 0.42, 0.08, accent);
    attach(chest, piping, [side * 0.23 * spec.bulk, 0.2, 0.29]);
    attach(hips, box(0.08, 0.12, 0.035, accent), [side * 0.21, 0.04, 0.17]);
  }
  attach(head, box(0.048, 0.065, 0.07, skin), [0, 0.1, 0.225]);
  attach(chest, box(0.11, 0.09, 0.035, accent), [0, 0.43, 0.34]);
}
