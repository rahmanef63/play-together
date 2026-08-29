import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const ignored = new Set([
  "node_modules",
  "dist",
  ".git",
  ".turbo",
  "coverage",
  "var",
  "_generated",
]);
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (sourceExtensions.has(extname(entry.name))) await inspect(path);
  }
}

async function inspect(path) {
  const rel = relative(root, path).replaceAll("\\", "/");
  const text = await readFile(path, "utf8");
  const imports = [...text.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)].map(
    (match) => match[2],
  );
  for (const specifier of imports) {
    if (rel.startsWith("games/")) {
      const allowedWorkspace =
        specifier === "@play-together/game-sdk" || specifier === "@play-together/contracts";
      if (specifier.startsWith("@play-together/") && !allowedWorkspace) {
        violations.push(`${rel}: game imports forbidden workspace package ${specifier}`);
      }
      if (
        specifier.includes("/apps/") ||
        specifier.includes("/convex") ||
        specifier.startsWith("../../apps")
      ) {
        violations.push(`${rel}: game imports platform implementation ${specifier}`);
      }
    }
    const concreteGamePackage =
      specifier.startsWith("@play-together/game-") && specifier !== "@play-together/game-sdk";
    if (rel.startsWith("apps/web/") && (specifier.includes("/games/") || concreteGamePackage)) {
      violations.push(`${rel}: web host statically imports a game ${specifier}`);
    }
    if (
      rel.startsWith("apps/realtime/") &&
      (specifier.includes("/games/") || concreteGamePackage)
    ) {
      violations.push(`${rel}: realtime gateway statically imports a game ${specifier}`);
    }
    if (
      rel.startsWith("packages/") &&
      (specifier.includes("/apps/") ||
        specifier.includes("/games/") ||
        specifier.includes("/convex/"))
    ) {
      violations.push(`${rel}: shared package imports an implementation ${specifier}`);
    }
  }
}

await walk(root);
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("Architecture boundaries: OK");
