import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverGames } from "./discover-games.mjs";

const games = await discoverGames();
const registry = {
  schemaVersion: 1,
  games: games.map(({ config }) => ({
    id: config.game.id,
    version: config.game.version,
    title: config.game.title,
    description: config.game.description,
    modes: config.modes,
    capabilities: config.capabilities,
    controller: config.controller,
    previewUrl: `/game-previews/${config.game.id}.png`,
  })),
};

const output = resolve("apps/web/public/game-registry.json");
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, `${JSON.stringify(registry, null, 2)}\n`);
const formatted = spawnSync("pnpm", ["exec", "biome", "format", "--write", output], {
  stdio: "inherit",
});
if (formatted.status !== 0) process.exit(formatted.status ?? 1);
console.log(`Generated registry for ${registry.games.length} games`);
