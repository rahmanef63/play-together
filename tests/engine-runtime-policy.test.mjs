import { describe, expect, it } from "vitest";
import { assertSupportedRuntimeDependencies } from "../scripts/engine-runtime-policy.mjs";

describe("engine runtime compatibility policy", () => {
  const catalog = {
    vendors: {
      three: {
        "0.185.1+pt1": { url: "/vendor-pt1.js", sha256: "abc" },
        "0.185.1+pt2": { url: "/vendor-pt2.js", sha256: "def" },
        "0.185.1+pt3": { url: "/vendor-pt3.js", sha256: "ghi" },
      },
    },
  };

  it("accepts only runtime ABIs explicitly supported by the engine", () => {
    expect(() =>
      assertSupportedRuntimeDependencies({ three: "0.185.1+pt1" }, catalog),
    ).not.toThrow();
    expect(() =>
      assertSupportedRuntimeDependencies({ three: "0.185.1+pt2" }, catalog),
    ).not.toThrow();
    expect(() =>
      assertSupportedRuntimeDependencies({ three: "0.185.1+pt3" }, catalog),
    ).not.toThrow();
    expect(() => assertSupportedRuntimeDependencies({ three: "999.0.0" }, catalog)).toThrow(
      /unsupported game runtime dependency/i,
    );
  });
});
