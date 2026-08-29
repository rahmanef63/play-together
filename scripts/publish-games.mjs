import { spawnSync } from "node:child_process";
import { discoverGames } from "./discover-games.mjs";

const discovered = await discoverGames();
const requested = process.argv.slice(2);
const ids = requested.length ? requested : discovered.map((game) => game.id);
const known = new Set(discovered.map((game) => game.id));
for (const id of ids) {
  if (!known.has(id)) throw new Error(`Unknown game: ${id}`);
  const result = spawnSync(process.execPath, ["scripts/publish-game.mjs", id], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Published ${ids.length} immutable game release${ids.length === 1 ? "" : "s"}`);
