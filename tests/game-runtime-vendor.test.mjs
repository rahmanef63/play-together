import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const sharedThreeGames = ["turbo-circuit", "sky-strike", "flight-trainer"];

describe("shared game runtime vendors", () => {
  it("keeps 3D cartridges thin and shares one cached Three.js runtime", async () => {
    const vendor = await readFile("apps/web/public/engine-vendors/three@0.185.1+pt1.js");
    let displayBytes = 0;
    let displayGzip = 0;
    for (const id of sharedThreeGames) {
      const config = JSON.parse(await readFile(`games/${id}/game.config.json`, "utf8"));
      expect(config.runtimeDependencies).toEqual({ three: "0.185.1+pt1" });
      const display = await readFile(`games/${id}/dist/display.js`);
      expect(display.byteLength).toBeLessThan(100_000);
      expect(display.toString("utf8")).toContain("@play-together/runtime/three@0.185.1+pt1");
      displayBytes += display.byteLength;
      displayGzip += gzipSync(display).byteLength;
    }
    expect(vendor.byteLength + displayBytes).toBeLessThan(650_000);
    expect(gzipSync(vendor).byteLength + displayGzip).toBeLessThan(180_000);
  });

  it("serves the engine vendor from a versioned generated artifact", async () => {
    const manifest = JSON.parse(
      await readFile("apps/web/public/engine-vendors/manifest.json", "utf8"),
    );
    const entry = manifest.vendors.three;
    expect(entry.version).toBe("0.185.1+pt1");
    expect(entry.url).toBe("/engine-vendors/three@0.185.1+pt1.js");
    expect(entry.bytes).toBe(
      (await stat("apps/web/public/engine-vendors/three@0.185.1+pt1.js")).size,
    );
    expect(entry.exports.length).toBeGreaterThan(20);
  });
});
