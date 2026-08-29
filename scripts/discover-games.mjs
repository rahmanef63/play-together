import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GAME_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function discoverGames(root = repositoryRoot) {
  const gamesRoot = resolve(root, "games");
  const entries = await readdir(gamesRoot, { withFileTypes: true });
  const games = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (!GAME_ID.test(entry.name)) throw new Error(`Invalid game directory id: ${entry.name}`);
    const gameRoot = resolve(gamesRoot, entry.name);
    let config;
    try {
      config = JSON.parse(await readFile(resolve(gameRoot, "game.config.json"), "utf8"));
    } catch (error) {
      throw new Error(`Game ${entry.name} has no valid game.config.json`, { cause: error });
    }
    if (config?.game?.id !== entry.name) {
      throw new Error(
        `Game directory ${entry.name} and config id ${String(config?.game?.id)} differ`,
      );
    }
    if (typeof config.game.version !== "string" || !config.game.version.trim()) {
      throw new Error(`Game ${entry.name} has no version`);
    }
    games.push({ id: entry.name, root: gameRoot, config });
  }
  games.sort((left, right) => left.id.localeCompare(right.id));
  if (!games.length) throw new Error("No games were discovered under games/*");
  return games;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const games = await discoverGames();
  console.log(games.map((game) => `${game.id}@${game.config.game.version}`).join("\n"));
}
