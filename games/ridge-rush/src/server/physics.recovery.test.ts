import { describe, expect, it } from "vitest";
import { BIKE_GROUND_OFFSET, courseElevation } from "../shared/course.js";
import { createRider } from "./model.js";
import { advanceRider } from "./physics.js";

describe("Ridge Rush airborne recovery rules", () => {
  it("does not turn an airborne lateral overshoot into an instant recovery", () => {
    const rider = createRider("air-line", 0);
    Object.assign(rider, {
      progress: 1460,
      speed: 24,
      checkpoint: 3,
      lane: 5.4,
      offTrailMs: 430,
      grounded: false,
      verticalSpeed: 2,
    });
    rider.altitude = courseElevation(rider.progress) + BIKE_GROUND_OFFSET + 6;
    const result = advanceRider(rider, 0.05, 100);
    expect(result.crashed).toBe(false);
    expect(rider.crashed).toBe(0);
    expect(rider.grounded).toBe(false);
    expect(rider.offTrailMs).toBeLessThan(430);
  });
});
