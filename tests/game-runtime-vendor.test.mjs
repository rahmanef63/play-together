import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const activeThreeGames = [
  "turbo-circuit",
  "sky-strike",
  "flight-trainer",
  "ridge-rush",
  "clash-arena",
];

describe("shared game runtime vendors", () => {
  it("moves the five active source cartridges to pt3 while preserving older ABIs", async () => {
    for (const id of activeThreeGames) {
      const config = JSON.parse(await readFile(`games/${id}/game.config.json`, "utf8"));
      expect(config.runtimeDependencies).toEqual({ three: "0.185.1+pt3" });
      const display = await readFile(`games/${id}/dist/display.js`);
      expect(display.toString("utf8")).toContain("@play-together/runtime/three@0.185.1+pt3");
    }
  });

  it("keeps every ABI artifact SHA-pinned and cacheable", async () => {
    const manifest = JSON.parse(
      await readFile("apps/web/public/engine-vendors/manifest.json", "utf8"),
    );
    for (const version of ["0.185.1+pt1", "0.185.1+pt2", "0.185.1+pt3"]) {
      const entry = manifest.vendors.three[version];
      expect(entry.version).toBe(version);
      expect(entry.url).toBe(`/engine-vendors/three@${version}.js`);
      expect(entry.bytes).toBe(
        (await stat(`apps/web/public/engine-vendors/three@${version}.js`)).size,
      );
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.exports.length).toBeGreaterThan(20);
    }
    const pt1 = await readFile("apps/web/public/engine-vendors/three@0.185.1+pt1.js");
    const pt2 = await readFile("apps/web/public/engine-vendors/three@0.185.1+pt2.js");
    const pt3 = await readFile("apps/web/public/engine-vendors/three@0.185.1+pt3.js");
    expect(
      gzipSync(pt1).byteLength + gzipSync(pt2).byteLength + gzipSync(pt3).byteLength,
    ).toBeLessThan(450_000);
  });
});
