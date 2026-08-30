import { access, readdir, readFile } from "node:fs/promises";
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
    const packageJson = JSON.parse(await readFile(resolve(gameRoot, "package.json"), "utf8"));
    if (packageJson.name !== `@play-together/game-${entry.name}`) {
      throw new Error(`Game ${entry.name} package name does not match its slice id`);
    }
    if (packageJson.version !== config.game.version) {
      throw new Error(`Game ${entry.name} package version and manifest config version differ`);
    }
    await requireFile(resolve(gameRoot, "src/display.ts"), `${entry.name} display source`);
    await requireFile(resolve(gameRoot, "src/server.ts"), `${entry.name} server source`);
    const presentation = config?.presentation?.remoteDisplay;
    if (!presentation || !["shared", "per-player"].includes(presentation.mode)) {
      throw new Error(`Game ${entry.name} has no valid remote display presentation mode`);
    }
    if (
      !Number.isInteger(presentation.maxViewports) ||
      presentation.maxViewports < 1 ||
      presentation.maxViewports > 4 ||
      (presentation.mode === "shared" && presentation.maxViewports !== 1) ||
      (presentation.mode === "per-player" && presentation.maxViewports < 2)
    ) {
      throw new Error(`Game ${entry.name} has an invalid remote display viewport limit`);
    }
    const consoleConfig = config?.controller?.console;
    if (consoleConfig?.renderer === "builtin") {
      if (!Array.isArray(consoleConfig.controls) || consoleConfig.controls.length === 0) {
        throw new Error(`Game ${entry.name} builtin console has no controls`);
      }
      const controlIds = consoleConfig.controls.map((control) => control?.id);
      if (
        controlIds.some((id) => typeof id !== "string") ||
        new Set(controlIds).size !== controlIds.length
      ) {
        throw new Error(`Game ${entry.name} builtin console control ids must be unique strings`);
      }
      try {
        await access(resolve(gameRoot, "src/controller.ts"));
        throw new Error(
          `Game ${entry.name} defines both builtin console config and src/controller.ts`,
        );
      } catch (error) {
        if (error?.message?.includes("defines both builtin console")) throw error;
      }
    } else {
      await requireFile(
        resolve(gameRoot, "src/controller.ts"),
        `${entry.name} custom controller source`,
      );
    }
    games.push({ id: entry.name, root: gameRoot, config });
  }
  games.sort((left, right) => left.id.localeCompare(right.id));
  if (!games.length) throw new Error("No games were discovered under games/*");
  return games;
}

async function requireFile(path, label) {
  try {
    await access(path);
  } catch (error) {
    throw new Error(`Missing ${label}`, { cause: error });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const games = await discoverGames();
  console.log(games.map((game) => `${game.id}@${game.config.game.version}`).join("\n"));
}
