import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildConsole } from "./config.mjs";
import { getGame } from "./read-actions.mjs";
import { gameRoot, readCatalog, readJson, runCommand, writeJson } from "./repository.mjs";
import {
  compareSemver,
  ensureTrailingNewline,
  LAYOUTS,
  normalizeControlTokens,
  normalizeModes,
  normalizePresentation,
  ORIENTATIONS,
  requireEnum,
  requireId,
  requireInteger,
  requireSemver,
  requireSource,
  requireText,
} from "./validation.mjs";
export async function updateGame(input) {
  const id = requireId(input.id);
  const root = gameRoot(id);
  const configPath = resolve(root, "game.config.json");
  const packagePath = resolve(root, "package.json");
  const config = await readJson(configPath);
  const packageJson = await readJson(packagePath);
  const expectedVersion = requireText(input.expectedVersion, "expectedVersion", 5, 40);
  if (config.game.version !== expectedVersion)
    throw new Error(
      `Version mismatch: expected ${expectedVersion}, current ${config.game.version}`,
    );
  const catalog = await readCatalog();
  const currentPublished = catalog.games.some(
    (entry) => entry.gameId === id && entry.version === config.game.version,
  );
  const requestedNewVersion =
    input.newVersion === undefined ? undefined : requireSemver(input.newVersion, "newVersion");
  const byteFields = [
    "title",
    "description",
    "minPlayers",
    "maxPlayers",
    "orientation",
    "layout",
    "controls",
    "modes",
    "serverSource",
    "displaySource",
    "testSource",
  ];
  if (
    currentPublished &&
    byteFields.some((field) => input[field] !== undefined) &&
    !requestedNewVersion
  )
    throw new Error(
      "Current version is published and immutable. Provide a greater newVersion before changing cartridge bytes.",
    );
  if (requestedNewVersion && compareSemver(requestedNewVersion, config.game.version) <= 0)
    throw new Error(`newVersion must be greater than ${config.game.version}`);
  const next = structuredClone(config);
  if (input.title !== undefined) next.game.title = requireText(input.title, "title", 2, 80);
  if (input.description !== undefined)
    next.game.description = requireText(input.description, "description", 8, 240);
  if (input.minPlayers !== undefined)
    next.game.minPlayers = requireInteger(input.minPlayers, "minPlayers", 1, 32);
  if (input.maxPlayers !== undefined)
    next.game.maxPlayers = requireInteger(input.maxPlayers, "maxPlayers", next.game.minPlayers, 32);
  if (next.game.maxPlayers < next.game.minPlayers)
    throw new Error("maxPlayers must be >= minPlayers");
  if (input.orientation !== undefined)
    next.controller.preferredOrientation = requireEnum(
      input.orientation,
      ORIENTATIONS,
      "orientation",
    );
  if (input.layout !== undefined)
    next.controller.console.layout = requireEnum(input.layout, LAYOUTS, "layout");
  if (input.controls !== undefined)
    next.controller.console = buildConsole(
      requireEnum(next.controller.console?.layout ?? "gamepad", LAYOUTS, "layout"),
      normalizeControlTokens(input.controls),
    );
  if (input.modes !== undefined) next.modes = normalizeModes(input.modes);
  const currentPresentation = next.presentation?.remoteDisplay ?? {
    mode: "shared",
    maxViewports: 1,
  };
  next.presentation = {
    remoteDisplay: normalizePresentation(
      input.remoteDisplay ?? currentPresentation.mode,
      input.maxViewports ?? currentPresentation.maxViewports,
      next.game.maxPlayers,
    ),
  };
  const nextVersion = requestedNewVersion ?? config.game.version;
  next.game.version = nextVersion;
  packageJson.version = nextVersion;
  await writeJson(configPath, next);
  await writeJson(packagePath, packageJson);
  for (const [field, file] of [
    ["serverSource", "server.ts"],
    ["displaySource", "display.ts"],
    ["testSource", "server.test.ts"],
  ]) {
    if (input[field] !== undefined)
      await writeFile(
        resolve(root, `src/${file}`),
        ensureTrailingNewline(requireSource(input[field], field)),
      );
  }
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  return { updated: true, previousVersion: expectedVersion, game: await getGame(id) };
}
