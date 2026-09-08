import * as THREE from "three";
import { expect, it } from "vitest";
import { BOOST_PAD, onBoostPad } from "../shared/trackFeatures.js";
import { placeRoadMarking } from "./roadMarkings.js";

it("aligns the rendered pad footprint and its arrow with authoritative course coordinates", () => {
  for (const heading of [0, Math.PI / 4, Math.PI / 2, -2]) {
    const pose = { id: 1, x: 12, z: -8, heading };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(BOOST_PAD.width, BOOST_PAD.length));
    placeRoadMarking(mesh, pose, 0.085);
    mesh.updateMatrixWorld();
    for (const x of [-0.99, 0.99])
      for (const y of [-0.99, 0.99]) {
        const point = new THREE.Vector3(
          (x * BOOST_PAD.width) / 2,
          (y * BOOST_PAD.length) / 2,
          0,
        ).applyMatrix4(mesh.matrixWorld);
        expect(onBoostPad(pose, point)).toBe(true);
      }
    const arrow = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);
    expect(arrow.x).toBeCloseTo(Math.sin(heading));
    expect(arrow.z).toBeCloseTo(Math.cos(heading));
    mesh.geometry.dispose();
  }
});
