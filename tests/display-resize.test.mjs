import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const canvasGames = ["dodge-dash", "maze-run", "orbit-dodge", "snake-arena"];
const webglGames = ["turbo-circuit", "sky-strike", "flight-trainer"];

describe("display resize discipline", () => {
  test("2D canvases guard backing-buffer writes and cancel their RAF", async () => {
    for (const game of canvasGames) {
      const source = await readFile(`games/${game}/src/display.ts`, "utf8");
      expect(source, game).toMatch(/c\.width !== pixelWidth/);
      expect(source, game).toMatch(/c\.height !== pixelHeight/);
      expect(source, game).toMatch(/cancelAnimationFrame\(raf\)/);
      expect(source, game).not.toMatch(/c\.width = Math\.(?:floor|max)\([^\n]+\);\n\s*c\.height =/);
    }
  });

  test("WebGL displays resize from ResizeObserver rather than every render frame", async () => {
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
