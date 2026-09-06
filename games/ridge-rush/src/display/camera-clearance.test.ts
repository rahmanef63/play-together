import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { centerLine, courseElevation } from "../shared/course.js";
import { terrainHeight } from "../shared/terrain.js";
import { corridorCamera } from "./camera-clearance.js";

describe("Ridge Rush chase camera safety", () => {
  it("keeps the chase camera above actual terrain on cliff and switchback sectors", () => {
    for (const progress of [420, 1_020, 1_940, 2_480, 3_120]) {
      for (const lane of [-2.4, 0, 2.4]) {
        const clearance = 2.1;
        const plan = corridorCamera(
          progress,
          lane,
          courseElevation(progress) + 1,
          7,
          false,
          clearance,
        );
        expect(plan.y).toBeGreaterThanOrEqual(
          terrainHeight(plan.progress, plan.x) + clearance - 1e-6,
        );
        expect(Math.abs(plan.x - centerLine(plan.progress))).toBeLessThan(2);
      }
    }
  });

  it("projects positive logical lane to screen-left in the downhill chase view", () => {
    const progress = 250;
    const altitude = courseElevation(progress) + 1;
    const plan = corridorCamera(progress, 0, altitude, 7, false, 2.1);
    const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 500);
    camera.position.set(plan.x, plan.y, plan.progress);
    camera.lookAt(centerLine(progress), altitude + 0.7, progress + 12);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const left = new THREE.Vector3(centerLine(progress) + 1, altitude, progress).project(camera).x;
    const right = new THREE.Vector3(centerLine(progress) - 1, altitude, progress).project(camera).x;
    expect(left).toBeLessThan(right);
  });
});
