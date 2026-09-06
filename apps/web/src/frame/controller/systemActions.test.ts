import { describe, expect, it } from "vitest";
import { controlGlyph, isAdvancedControl } from "./systemActions";

describe("controller system actions", () => {
  it("keeps shoulder buttons advanced while ABXY and Start remain core", () => {
    for (const face of ["l1", "r1", "l2", "r2"])
      expect(isAdvancedControl({ kind: "button", face } as never)).toBe(true);
    for (const face of ["a", "b", "x", "y", "start"])
      expect(isAdvancedControl({ kind: "button", face } as never)).toBe(false);
  });

  it("uses compact physical legends in the generated how-to", () => {
    expect(controlGlyph({ kind: "stick" } as never)).toBe("STICK");
    expect(controlGlyph({ kind: "dpad" } as never)).toBe("D-PAD");
    expect(controlGlyph({ kind: "button", face: "a", label: "A" } as never)).toBe("A");
    expect(controlGlyph({ kind: "button", face: "start", label: "START" } as never)).toBe("START");
  });
});
