import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverGames } from "../scripts/discover-games.mjs";

describe("game slice registry", () => {
  it("keeps every discovered game as a single manifest-driven feature slice", async () => {
    const discovered = await discoverGames();
    const registry = JSON.parse(
      await readFile(resolve("apps/web/public/game-registry.json"), "utf8"),
    );
    expect(registry.schemaVersion).toBe(1);
    expect(registry.games).toHaveLength(discovered.length);
    expect(discovered).toHaveLength(15);

    const byId = new Map(registry.games.map((game) => [game.id, game]));
    for (const game of discovered) {
      const entry = byId.get(game.id);
      expect(entry, `${game.id} registry entry`).toBeTruthy();
      expect(entry.version).toBe(game.config.game.version);
      expect(entry.controller).toEqual(game.config.controller);
      expect(entry.presentation).toEqual(game.config.presentation);
      expect(entry.presentation.remoteDisplay.mode).toMatch(/^(shared|per-player)$/);
      expect(entry.presentation.remoteDisplay.maxViewports).toBeGreaterThanOrEqual(1);
      expect(entry.previewUrl).toBe(`/game-previews/${game.id}.png`);
      expect(game.config.controller.console?.renderer).toBe("builtin");
      expect(game.config.controller.console?.controls.length).toBeGreaterThan(0);
      await expect(access(resolve(game.root, "src/controller.ts"))).rejects.toThrow();
    }
  });
});
