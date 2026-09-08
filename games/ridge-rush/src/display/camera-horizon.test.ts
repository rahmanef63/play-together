import * as THREE from "three";
import { expect, it } from "vitest";
import { courseElevation } from "../shared/course.js";
import { createPose, updateCamera } from "./camera.js";
import type { RiderView, RidgeViewState } from "./model.js";
import type { RidgeScene } from "./scene.js";

it("keeps the camera horizon level across course headings when the rider is not leaning", () => {
  for (const progress of [100, 1200, 2250]) {
    const rider = {
      id: "p",
      bot: false,
      progress,
      lane: 0,
      altitude: courseElevation(progress) + 0.08,
      speed: 10,
      lean: 0,
      pitch: 0,
      rearView: false,
      suspensionFront: 0,
      suspensionRear: 0,
    } as RiderView;
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    updateCamera(
      { camera } as RidgeScene,
      { riders: [rider] } as RidgeViewState,
      "p",
      "handheld",
      new Map([["p", createPose(rider)]]),
      new THREE.Vector3(),
      false,
      1 / 60,
    );
    const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    expect(Math.abs(screenRight.y)).toBeLessThan(0.001);
  }
});
