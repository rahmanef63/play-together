import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
const buildTasks = [
  build({
    ...common,
    platform: "browser",
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
      entryPoints: [resolve(gameRoot, "src/controller.ts")],
      outfile: resolve(outdir, "controller.js"),
    }),
  );
}
await Promise.all(buildTasks);
const digest = async (name) =>
  createHash("sha256")
    .update(await readFile(resolve(outdir, name)))
    .digest("hex");
const entries = {
  display: { url: "./display.js", sha256: await digest("display.js") },
  server: { url: "./server.js", sha256: await digest("server.js") },
};
if (!builtinController) {
  entries.controller = { url: "./controller.js", sha256: await digest("controller.js") };
}
const manifest = { ...config, entries };
await writeFile(resolve(outdir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.game.id}@${manifest.game.version}`);
