import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { validateGame } from "./read-actions.mjs";
import {
  exists,
  gameRoot,
  readCatalog,
  readJson,
  refreshWorkspaceLinks,
  runCommand,
} from "./repository.mjs";
export async function deleteGame(id) {
  const root = gameRoot(id);
  if (!(await exists(root))) throw new Error(`Game ${id} does not exist`);
  const catalog = await readCatalog();
  if (catalog.games.some((entry) => entry.gameId === id))
    throw new Error(
      "Published games cannot be deleted. Historical releases and pinned rooms are immutable.",
    );
  await rm(root, { recursive: true, force: false });
  await refreshWorkspaceLinks();
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  return { deleted: true, id };
}

export async function publishGame(id) {
  await validateGame(id);
  const output = await runCommand("node", ["scripts/publish-game.mjs", id]);
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  const catalog = await readCatalog();
  const config = await readJson(resolve(gameRoot(id), "game.config.json"));
  const release = catalog.games.find(
    (entry) => entry.gameId === id && entry.version === config.game.version,
  );
  if (!release) throw new Error("Publish completed without a catalog entry");
  return {
    published: true,
    release,
    note: "Local immutable release created. Production registration is intentionally performed only by verified main-branch CI.",
    output: output.split("\n").at(-1) ?? "",
  };
}
