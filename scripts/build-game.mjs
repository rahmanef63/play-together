import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv[2];
if (!argument) throw new Error("Usage: node scripts/build-game.mjs games/<game-id>");
const gameRoot = resolve(repositoryRoot, argument);
if (!gameRoot.startsWith(`${resolve(repositoryRoot, "games")}/`)) {
  throw new Error("Game build path must be inside games/");
}
const config = JSON.parse(await readFile(resolve(gameRoot, "game.config.json"), "utf8"));
if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(config?.game?.id ?? "")) {
  throw new Error("game.config.json contains an invalid game id");
}
const outdir = resolve(gameRoot, "dist");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "warning",
};
const builtinController = config?.controller?.console?.renderer === "builtin";
const runtimeDependencies = normalizeRuntimeDependencies(config?.runtimeDependencies);
const runtimePlugin = createRuntimeDependencyPlugin(runtimeDependencies);
const buildTasks = [
  build({
    ...common,
    platform: "browser",
    plugins: [runtimePlugin],
    entryPoints: [resolve(gameRoot, "src/display.ts")],
    outfile: resolve(outdir, "display.js"),
  }),
  build({
    ...common,
    platform: "node",
    entryPoints: [resolve(gameRoot, "src/server.ts")],
    outfile: resolve(outdir, "server.js"),
  }),
];
if (!builtinController) {
  buildTasks.push(
    build({
      ...common,
      platform: "browser",
      plugins: [runtimePlugin],
      entryPoints: [resolve(gameRoot, "src/controller.ts")],
      outfile: resolve(outdir, "controller.js"),
    }),
  );
}
await Promise.all(buildTasks);
const digestFile = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const digest = async (name) => digestFile(resolve(outdir, name));

const runtimeAssetRoot = resolve(gameRoot, "assets/runtime");
let assetManifest;
try {
  assetManifest = JSON.parse(
    await readFile(resolve(runtimeAssetRoot, "asset-manifest.json"), "utf8"),
  );
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
let assets;
if (assetManifest) {
  if (
    assetManifest.schemaVersion !== 1 ||
    typeof assetManifest.assets !== "object" ||
    !assetManifest.assets
  ) {
    throw new Error("assets/runtime/asset-manifest.json is invalid");
  }
  assets = {};
  for (const [name, entry] of Object.entries(assetManifest.assets)) {
    if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(name))
      throw new Error(`Invalid game asset name: ${name}`);
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.file !== "string" ||
      typeof entry.contentType !== "string"
    ) {
      throw new Error(`Invalid game asset entry: ${name}`);
    }
    const sourcePath = resolve(runtimeAssetRoot, entry.file);
    const relation = relative(runtimeAssetRoot, sourcePath);
    if (!relation || relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
      throw new Error(`Game asset escapes runtime directory: ${name}`);
    }
    const info = await stat(sourcePath);
    if (!info.isFile() || info.size <= 0) throw new Error(`Game asset is not a file: ${name}`);
    const outputPath = resolve(outdir, "assets", relation);
    await mkdir(dirname(outputPath), { recursive: true });
    await copyFile(sourcePath, outputPath);
    assets[name] = {
      url: `./assets/${relation.split(sep).join("/")}`,
      sha256: await digestFile(outputPath),
      contentType: entry.contentType,
      bytes: info.size,
    };
  }
}
const entries = {
  display: { url: "./display.js", sha256: await digest("display.js") },
  server: { url: "./server.js", sha256: await digest("server.js") },
};
if (!builtinController) {
  entries.controller = { url: "./controller.js", sha256: await digest("controller.js") };
}
const { presentation: _hostPresentation, ...releaseConfig } = config;
const manifest = { ...releaseConfig, entries, ...(assets ? { assets } : {}) };
await writeFile(resolve(outdir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.game.id}@${manifest.game.version}`);

function normalizeRuntimeDependencies(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("runtimeDependencies must be an object");
  }
  const normalized = {};
  for (const [name, version] of Object.entries(value)) {
    if (!/^[a-z0-9@][a-z0-9@/._-]{0,79}$/.test(name) || typeof version !== "string") {
      throw new Error(`Invalid runtime dependency: ${name}`);
    }
    normalized[name] = version;
  }
  return normalized;
}

function createRuntimeDependencyPlugin(dependencies) {
  return {
    name: "play-together-runtime-dependencies",
    setup(buildContext) {
      buildContext.onResolve({ filter: /^[^./]/ }, (args) => {
        const version = dependencies[args.path];
        if (!version) return undefined;
        return { path: `@play-together/runtime/${args.path}@${version}`, external: true };
      });
    },
  };
}
