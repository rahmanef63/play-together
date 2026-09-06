import { describe, expect, it } from "vitest";
import { createRider } from "./model.js";
import { advanceVertical, groundHeight } from "./vertical.js";

describe("Ridge Rush vertical bike motion", () => {
  it("gives a generic bunny hop a usable arcade trick window", () => {
    const rider = createRider("bunny-window", 0);
    rider.progress = 1260;
    rider.speed = 12;
    rider.altitude = groundHeight(rider.progress, rider.lane);
    rider.jumpQueued = true;
    let previousProgress = rider.progress;
    let previousGround = groundHeight(previousProgress, rider.lane);
    rider.progress += rider.speed * 0.05;
    let nextGround = groundHeight(rider.progress, rider.lane);
    advanceVertical(rider, 0.05, previousProgress, previousGround, nextGround);
    expect(rider.grounded).toBe(false);
    let airborneFor = 0.05;
    while (!rider.grounded && airborneFor < 1.5) {
      previousProgress = rider.progress;
      previousGround = groundHeight(previousProgress, rider.lane);
      rider.progress += rider.speed * 0.05;
      nextGround = groundHeight(rider.progress, rider.lane);
      advanceVertical(rider, 0.05, previousProgress, previousGround, nextGround);
      airborneFor += 0.05;
    }
    expect(airborneFor).toBeGreaterThan(0.75);
  });
});
