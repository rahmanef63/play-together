import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const outdir = resolve(root, "dist");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  minify: true,
  legalComments: "none",
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: "warning",
};
await Promise.all([
  build({
    ...common,
    entryPoints: [resolve(root, "src/index.ts")],
    outfile: resolve(outdir, "index.js"),
  }),
  build({
    ...common,
    entryPoints: [resolve(root, "src/runtime/game-worker.ts")],
    outfile: resolve(outdir, "game-worker.js"),
  }),
]);
