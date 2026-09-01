import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const id = process.argv[2];
if (!id || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) {
  throw new Error("Usage: node scripts/publish-game.mjs <game-id>");
}
const root = process.cwd();
const gameRoot = resolve(root, "games", id);
const config = JSON.parse(await readFile(resolve(gameRoot, "game.config.json"), "utf8"));
if (config.game.id !== id) throw new Error("Game directory and config id differ");
const result = spawnSync("pnpm", ["--filter", `@play-together/game-${id}`, "build"], {
  cwd: root,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);

const source = resolve(gameRoot, "dist");
const destination = resolve(root, "releases/game-cdn/games", id, config.game.version);
const sourceManifest = await readFile(resolve(source, "manifest.json"));
const manifestSha256 = createHash("sha256").update(sourceManifest).digest("hex");
if (await exists(destination)) {
  const installedManifest = await readFile(resolve(destination, "manifest.json"));
  const installedSha256 = createHash("sha256").update(installedManifest).digest("hex");
  if (installedSha256 !== manifestSha256) {
    throw new Error(
      `Immutable release ${id}@${config.game.version} already exists with a different digest`,
    );
  }
} else {
  const temporary = `${destination}.staging-${process.pid}`;
  await mkdir(resolve(root, "releases/game-cdn/games", id), { recursive: true });
  await rm(temporary, { recursive: true, force: true });
  await cp(source, temporary, { recursive: true, force: false });
  await rename(temporary, destination);
}

const catalogPath = resolve(root, "releases/game-cdn/catalog.json");
let catalog = { schemaVersion: 1, games: [] };
try {
  catalog = JSON.parse(await readFile(catalogPath, "utf8"));
} catch {}
const existing = catalog.games.find(
  (item) => item.gameId === id && item.version === config.game.version,
);
if (existing && existing.manifestSha256 !== manifestSha256) {
  throw new Error(`Catalog already pins ${id}@${config.game.version} to another digest`);
}
const entry = {
  gameId: id,
  version: config.game.version,
  title: config.game.title,
  manifestPath: `/games/${id}/${config.game.version}/manifest.json`,
  manifestSha256,
  presentation: config.presentation ?? { remoteDisplay: { mode: "shared", maxViewports: 1 } },
};
catalog.games = catalog.games.filter(
  (item) => !(item.gameId === id && item.version === config.game.version),
);
catalog.games.push(entry);
catalog.games.sort((a, b) => `${a.gameId}@${a.version}`.localeCompare(`${b.gameId}@${b.version}`));
await mkdir(resolve(root, "releases/game-cdn"), { recursive: true });
const catalogTemporary = `${catalogPath}.${process.pid}.tmp`;
await writeFile(
  catalogTemporary,
  `${JSON.stringify(catalog, null, 2)}
`,
);
await rename(catalogTemporary, catalogPath);
console.log(JSON.stringify(entry));

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
