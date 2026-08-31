import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildConfig, buildPackage } from "./config.mjs";
import { getGame } from "./read-actions.mjs";
import { exists, gameRoot, refreshWorkspaceLinks, runCommand, writeJson } from "./repository.mjs";
import { starterDisplay, starterServer, starterTest } from "./starters.mjs";
import {
  ensureTrailingNewline,
  LAYOUTS,
  normalizeControlTokens,
  normalizeModes,
  normalizePresentation,
  ORIENTATIONS,
  optionalSource,
  requireEnum,
  requireId,
  requireInteger,
  requireText,
} from "./validation.mjs";
export async function createGame(input) {
  const id = requireId(input.id);
  const root = gameRoot(id);
  if (await exists(root)) throw new Error(`Game ${id} already exists`);
  const title = requireText(input.title, "title", 2, 80);
  const description = requireText(input.description, "description", 8, 240);
  const minPlayers = requireInteger(input.minPlayers, "minPlayers", 1, 32);
  const maxPlayers = requireInteger(input.maxPlayers, "maxPlayers", minPlayers, 32);
  const orientation = requireEnum(input.orientation ?? "adaptive", ORIENTATIONS, "orientation");
  const layout = requireEnum(input.layout ?? "gamepad", LAYOUTS, "layout");
  const controls = normalizeControlTokens(input.controls ?? ["a"]);
  const modes = normalizeModes(input.modes ?? ["shared-screen", "handheld"]);
  const presentation = normalizePresentation(
    input.remoteDisplay ??
      ((layout === "racing" || layout === "flight") && maxPlayers > 1 ? "per-player" : "shared"),
    input.maxViewports,
    maxPlayers,
  );
  const version = "0.1.0";
  const config = buildConfig({
    id,
    title,
    description,
    minPlayers,
    maxPlayers,
    orientation,
    layout,
    controls,
    modes,
    presentation,
    version,
  });
  await mkdir(resolve(root, "src"), { recursive: true });
  await Promise.all([
    writeJson(resolve(root, "game.config.json"), config),
    writeJson(resolve(root, "package.json"), buildPackage(id, version)),
    writeJson(resolve(root, "tsconfig.json"), {
      extends: "../../tsconfig.base.json",
      compilerOptions: { types: ["vitest/globals"] },
      include: ["src/**/*.ts"],
    }),
    writeFile(
      resolve(root, "src/server.ts"),
      ensureTrailingNewline(optionalSource(input.serverSource) ?? starterServer(id)),
    ),
    writeFile(
      resolve(root, "src/display.ts"),
      ensureTrailingNewline(optionalSource(input.displaySource) ?? starterDisplay(id, title)),
    ),
    writeFile(
      resolve(root, "src/server.test.ts"),
      ensureTrailingNewline(optionalSource(input.testSource) ?? starterTest(id)),
    ),
  ]);
  await refreshWorkspaceLinks();
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  return {
    created: true,
    game: await getGame(id),
    note: "Draft scaffold created. Implement real mechanics and validate before publishing.",
  };
}
