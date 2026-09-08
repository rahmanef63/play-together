import { describe, expect, it } from "vitest";
import { faceButtonCount, physicalZoneForControl } from "../builtinController";
import { canonicalFaceSymbol } from "./symbols";

const button = (face: string, zone = "center") =>
  ({ kind: "button", face, zone }) as Parameters<typeof physicalZoneForControl>[0];

describe("shared physical controller layout", () => {
  it("normalizes every logical face button into one physical face cluster", () => {
    for (const face of ["a", "b", "c", "d", "x", "y"])
      expect(physicalZoneForControl(button(face, "top-left"))).toBe("right");
  });

  it("renders only face controls requested by the manifest", () => {
    expect(faceButtonCount([button("a")])).toBe(1);
    expect(faceButtonCount([button("a"), button("b")])).toBe(2);
    expect(faceButtonCount([button("a"), button("b"), button("x")])).toBe(3);
    expect(faceButtonCount([button("a"), button("b"), button("x"), button("y")])).toBe(4);
    expect(faceButtonCount([button("start"), button("l1")])).toBe(0);
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

describe("universal face symbols", () => {
  it("maps logical faces to physical PlayStation-style symbols without changing semantics", () => {
    expect(canonicalFaceSymbol("a")).toBe("cross");
    expect(canonicalFaceSymbol("b")).toBe("circle");
    expect(canonicalFaceSymbol("x")).toBe("square");
    expect(canonicalFaceSymbol("y")).toBe("triangle");
    expect(canonicalFaceSymbol("c")).toBe("square");
    expect(canonicalFaceSymbol("d")).toBe("triangle");
    expect(canonicalFaceSymbol("start")).toBeNull();
  });
});
