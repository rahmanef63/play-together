import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
    expect(discovered.map((game) => game.id).sort()).toEqual([
      "flight-trainer",
      "sky-strike",
      "turbo-circuit",
    ]);

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

  it("ignores artifact-only directories restored by workspace build caches", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "play-together-games-"));
    try {
      const validRoot = resolve(root, "games/fixture-game");
      await mkdir(resolve(validRoot, "src"), { recursive: true });
      await mkdir(resolve(root, "games/stale-game/node_modules"), { recursive: true });
      await writeFile(
        resolve(validRoot, "game.config.json"),
        JSON.stringify({
          game: { id: "fixture-game", version: "1.0.0" },
          presentation: { remoteDisplay: { mode: "shared", maxViewports: 1 } },
          controller: { console: { renderer: "builtin", controls: [{ id: "start" }] } },
        }),
      );
      await writeFile(
        resolve(validRoot, "package.json"),
        JSON.stringify({ name: "@play-together/game-fixture-game", version: "1.0.0" }),
      );
      await writeFile(resolve(validRoot, "src/display.ts"), "export {};\n");
      await writeFile(resolve(validRoot, "src/server.ts"), "export {};\n");

      const discovered = await discoverGames(root);
      expect(discovered.map((game) => game.id)).toEqual(["fixture-game"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
