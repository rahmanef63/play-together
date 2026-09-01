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
  writeJson,
} from "./repository.mjs";
import {
  RELEASE_STATUSES,
  requireEnum,
  requireId,
  requireSemver,
  requireText,
} from "./validation.mjs";
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

export async function setReleaseStatus(input) {
  const id = requireId(input.id);
  const version = requireSemver(input.version, "version");
  const status = requireEnum(input.status, RELEASE_STATUSES, "status");
  const reason = status === "active" ? undefined : requireText(input.reason, "reason", 1, 240);
  const catalog = await readCatalog();
  const release = catalog.games.find((entry) => entry.gameId === id && entry.version === version);
  if (!release) throw new Error(`Release ${id}@${version} does not exist`);
  release.status = status;
  if (reason) release.retirementReason = reason;
  else delete release.retirementReason;
  await writeJson(resolve("releases/game-cdn/catalog.json"), catalog);
  return {
    updated: true,
    gameId: id,
    version,
    status,
    retirementReason: reason,
    note: "Host release policy updated locally. Merge to main to apply it to production Convex.",
  };
}
