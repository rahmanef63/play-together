import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const webglGames = ["turbo-circuit", "sky-strike", "flight-trainer"];

describe("display resize discipline", () => {
  test("all active WebGL displays resize from ResizeObserver rather than every render frame", async () => {
    for (const game of webglGames) {
      const source = await readFile(`games/${game}/src/display.ts`, "utf8");
      expect(source, game).toContain("new ResizeObserver(resize)");
      expect(source, game).toContain("resizeObserver.disconnect()");
      const loopStart = source.indexOf("const loop = (");
      const renderCall = source.indexOf("renderer.render", loopStart);
      expect(loopStart, game).toBeGreaterThan(-1);
      expect(renderCall, game).toBeGreaterThan(loopStart);
      expect(source.slice(loopStart, renderCall), game).not.toContain("renderer.setSize(");
    }
  });
});
