import * as THREE from "three";

const q = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const track = (node, times, eulers) =>
  new THREE.QuaternionKeyframeTrack(
    `${node}.quaternion`,
    times,
    eulers.flatMap(([x, y, z]) => q(x, y, z).toArray()),
  );
export function fighterAnimations(spec) {
  const fast = spec.id === "nova-rin" ? 1 : 0.9;
  return [
    new THREE.AnimationClip("idle", 1.4, [
      track(
        "chest",
        [0, 0.7, 1.4],
        [
          [0, 0, 0],
          [0.025, 0, 0.02],
          [0, 0, 0],
        ],
      ),
    ]),
    new THREE.AnimationClip("guard", 0.7, [
      track(
        "upper_arm.L",
        [0, 0.35, 0.7],
        [
          [0, 0, 0],
          [-0.85, 0, 0.45],
          [-0.7, 0, 0.38],
        ],
      ),
      track(
        "upper_arm.R",
        [0, 0.35, 0.7],
        [
          [0, 0, 0],
          [-0.85, 0, -0.45],
          [-0.7, 0, -0.38],
        ],
      ),
    ]),
    new THREE.AnimationClip("jab", 0.34 / fast, [
      track(
        "upper_arm.R",
        [0, 0.12, 0.34].map((v) => v / fast),
        [
          [0, 0, 0],
          [-1.55, 0, -0.18],
          [0, 0, 0],
        ],
      ),
    ]),
    new THREE.AnimationClip("kick", 0.52 / fast, [
      track(
        "thigh.R",
        [0, 0.2, 0.52].map((v) => v / fast),
        [
          [0, 0, 0],
          [1.42, 0, -0.12],
          [0, 0, 0],
        ],
      ),
    ]),
    new THREE.AnimationClip("hit", 0.4, [
      track(
        "chest",
        [0, 0.14, 0.4],
        [
          [0, 0, 0],
          [0.18, 0.2, 0.25],
          [0, 0, 0],
        ],
      ),
    ]),
    new THREE.AnimationClip("victory", 1.1, [
      track(
        "upper_arm.L",
        [0, 0.45, 1.1],
        [
          [0, 0, 0],
          [-2.2, 0, 0.25],
          [-1.9, 0, 0.18],
        ],
      ),
      track(
        "upper_arm.R",
        [0, 0.45, 1.1],
        [
          [0, 0, 0],
          [-2.2, 0, -0.25],
          [-1.9, 0, -0.18],
        ],
      ),
    ]),
  ];
}
