import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { CreateServerGame } from "@play-together/game-sdk";
import { describe, expect, it } from "vitest";

interface GameConfig {
  game: { id: string; version: string };
}

describe("latest cartridge server stability", () => {
  it("runs every current game through a sustained idle simulation without invalid snapshots", async () => {
    const gameDirectories = (await readdir(resolve("games"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(gameDirectories).toEqual(["flight-trainer", "sky-strike", "turbo-circuit"]);

    for (const directory of gameDirectories) {
      const config = JSON.parse(
        await readFile(resolve("games", directory, "game.config.json"), "utf8"),
      ) as GameConfig;
      const moduleUrl = pathToFileURL(
        resolve("releases/game-cdn/games", config.game.id, config.game.version, "server.js"),
      );
      const imported = (await import(`${moduleUrl.href}?stability=${config.game.id}`)) as {
        createServerGame?: CreateServerGame;
      };
      expect(imported.createServerGame, `${config.game.id} server export`).toBeTypeOf("function");
      if (!imported.createServerGame) continue;

      const game = await imported.createServerGame({
        roomId: `stability-${config.game.id}`,
        gameId: config.game.id,
        gameVersion: config.game.version,
        seed: 0x5eed1234,
      });
      const playerId = "stability-player";
      await game.onJoin({ id: playerId, connectedAt: 1_000 });

      let now = 1_000;
      for (let tick = 0; tick < 240; tick += 1) {
        now += 1000 / 60;
        await game.tick(now, 1000 / 60);
        if (tick % 30 === 0) {
          const serialized = JSON.stringify(game.snapshot());
          expect(serialized.length, `${config.game.id} snapshot bytes`).toBeLessThan(
            2 * 1024 * 1024,
          );
          expect(serialized, `${config.game.id} snapshot contains NaN`).not.toContain("NaN");
          expect(() => JSON.parse(serialized)).not.toThrow();
        }
      }

      await game.onLeave(playerId);
      await game.dispose?.();
    }
  });
});
