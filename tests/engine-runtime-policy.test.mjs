import { describe, expect, it } from "vitest";
import { assertSupportedRuntimeDependencies } from "../scripts/engine-runtime-policy.mjs";

describe("engine runtime compatibility policy", () => {
  const catalog = {
    vendors: { three: { "0.185.1+pt1": { url: "/vendor.js", sha256: "abc" } } },
  };

  it("accepts only runtime ABIs explicitly supported by the engine", () => {
    expect(() =>
      assertSupportedRuntimeDependencies({ three: "0.185.1+pt1" }, catalog),
    ).not.toThrow();
    expect(() => assertSupportedRuntimeDependencies({ three: "999.0.0" }, catalog)).toThrow(
      /unsupported game runtime dependency/i,
    );
  });
});
