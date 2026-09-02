import { describe, expect, it } from "vitest";
import { physicalZoneForControl } from "../builtinController";

const button = (face: string, zone = "center") =>
  ({ kind: "button", face, zone }) as Parameters<typeof physicalZoneForControl>[0];

describe("shared physical controller layout", () => {
  it("normalizes face buttons into one ABXY cluster", () => {
    for (const face of ["a", "b", "c", "d", "x", "y"])
      expect(physicalZoneForControl(button(face, "top-left"))).toBe("right");
  });

  it("normalizes shoulders and system buttons by physical role", () => {
    expect(physicalZoneForControl(button("l1"))).toBe("top-left");
    expect(physicalZoneForControl(button("l2"))).toBe("top-left");
    expect(physicalZoneForControl(button("r1"))).toBe("top-right");
    expect(physicalZoneForControl(button("r2"))).toBe("top-right");
    expect(physicalZoneForControl(button("start"))).toBe("bottom");
    expect(physicalZoneForControl(button("pause"))).toBe("bottom");
  });
});
