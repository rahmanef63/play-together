import { expect, it } from "vitest";
import { onBoostPad } from "./trackFeatures.js";

it("activates only inside the rendered pad rectangle, including rotated pads", () => {
  for (const heading of [0, Math.PI / 4, Math.PI / 2, -2]) {
    const pad = { id: 0, x: 12, z: -8, heading };
    const point = (lateral: number, forward: number) => ({
      x: pad.x + Math.cos(heading) * lateral + Math.sin(heading) * forward,
      z: pad.z - Math.sin(heading) * lateral + Math.cos(heading) * forward,
    });
    expect(onBoostPad(pad, point(3.8, 2.3))).toBe(true);
    expect(onBoostPad(pad, point(0, 3.5))).toBe(false);
    expect(onBoostPad(pad, point(4.1, 0))).toBe(false);
  }
});
