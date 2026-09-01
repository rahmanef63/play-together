import { resolve } from "node:path";
import { discoverGames } from "../discover-games.mjs";
import { gameRoot, ROOT, readCatalog, readJson, runCommand } from "./repository.mjs";

export async function listGames() {
  const games = await discoverGames(ROOT);
  const catalog = await readCatalog();
  return {
    count: games.length,
    games: games.map(({ id, config }) => {
      const releases = catalog.games.filter((entry) => entry.gameId === id);
      const currentRelease = releases.find((entry) => entry.version === config.game.version);
      const currentReleaseStatus = currentRelease?.status ?? (currentRelease ? "active" : "draft");
      return {
        id,
        title: config.game.title,
        version: config.game.version,
        minPlayers: config.game.minPlayers,
        maxPlayers: config.game.maxPlayers,
        layout: config.controller?.console?.layout ?? "custom",
        remoteDisplay: config.presentation?.remoteDisplay?.mode ?? "shared",
        maxViewports: config.presentation?.remoteDisplay?.maxViewports ?? 1,
        controls: (config.controller?.console?.controls ?? []).map((control) => control.id),
        published: currentReleaseStatus === "active",
        currentReleaseStatus,
        releaseCount: releases.length,
      };
    }),
  };
}
export async function getGame(id) {
  const root = gameRoot(id);
  const [config, packageJson, catalog] = await Promise.all([
    readJson(resolve(root, "game.config.json")),
    readJson(resolve(root, "package.json")),
    readCatalog(),
  ]);
  const releases = catalog.games.filter((entry) => entry.gameId === id);
  return {
    id,
    root: `games/${id}`,
    config,
    package: { name: packageJson.name, version: packageJson.version },
    releases,
    currentVersionPublished: releases.some(
      (entry) => entry.version === config.game.version && (entry.status ?? "active") === "active",
    ),
    currentReleaseStatus:
      releases.find((entry) => entry.version === config.game.version)?.status ??
      (releases.some((entry) => entry.version === config.game.version) ? "active" : "draft"),
  };
}
export async function validateGame(id) {
  await getGame(id);
  const packageName = `@play-together/game-${id}`;
  for (const [step, args] of [
    ["discover", ["scripts/discover-games.mjs"]],
    ["typecheck", ["--filter", packageName, "typecheck"]],
    ["test", ["--filter", packageName, "test"]],
    ["build", ["--filter", packageName, "build"]],
  ])
    await runCommand(step === "discover" ? "node" : "pnpm", args);
  return { ok: true, id, results: ["discover", "typecheck", "test", "build"] };
}
export async function refreshRegistry() {
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  const registry = await readJson(resolve(ROOT, "apps/web/public/game-registry.json"));
  return { generated: true, schemaVersion: registry.schemaVersion, count: registry.games.length };
}
