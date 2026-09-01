import { describe, expect, it } from "vitest";
import vendorCatalog from "../../../../config/engine-vendors.json";
import { resolveRuntimeImports } from "./runtimeDependencies";

describe("game runtime dependencies", () => {
  it("maps a supported ABI to one SHA-pinned versioned engine vendor", () => {
    const entry = vendorCatalog.vendors.three["0.185.1+pt1"];
    const imports = resolveRuntimeImports(
      { runtimeDependencies: { three: "0.185.1+pt1" } } as never,
      "https://game.test",
    );
    expect(imports).toEqual({
      "@play-together/runtime/three@0.185.1+pt1": {
        url: "https://game.test/engine-vendors/three@0.185.1+pt1.js",
        sha256: entry.sha256,
      },
    });
  });

  it("rejects unsupported dependency versions", () => {
    expect(() =>
      resolveRuntimeImports(
        { runtimeDependencies: { three: "999.0.0" } } as never,
        "https://game.test",
      ),
    ).toThrow("Unsupported game runtime dependency");
  });
});
