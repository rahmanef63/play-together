import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

const root = process.cwd();
const importExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const budgetExtensions = new Set([...importExtensions, ".css"]);
const MAX_MAINTAINED_LINES = 200;
const ignored = new Set([
  "node_modules",
  "dist",
  ".git",
  ".turbo",
  ".vercel",
  "coverage",
  "var",
  "releases",
  "test-results",
  "playwright-report",
  "_generated",
]);
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (budgetExtensions.has(extname(entry.name))) await inspect(path);
  }
}

async function inspect(path) {
  const rel = toRelative(path);
  const text = await readFile(path, "utf8");
  enforceLineBudget(rel, text);
  enforceDynamicEngineBoundary(rel, text);
  if (!importExtensions.has(extname(path))) return;

  for (const specifier of extractImports(text)) {
    enforceGameIsolation(rel, specifier, path);
    enforcePlatformIsolation(rel, specifier);
    enforceWebVerticalSlices(rel, specifier, path);
    enforcePackageEsmImports(rel, specifier);
  }
}

function enforceLineBudget(rel, text) {
  if (!isMaintainedSource(rel)) return;
  const lines = text === "" ? 0 : text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
  if (lines > MAX_MAINTAINED_LINES) {
    violations.push(
      `${rel}: ${lines} lines exceeds maintained-source budget ${MAX_MAINTAINED_LINES}; split by ownership instead of adding a size exception`,
    );
  }
}

function isMaintainedSource(rel) {
  const roots = [
    "apps/",
    "convex/",
    "packages/",
    "games/",
    "scripts/",
    "tests/",
    "e2e/",
    "api/",
    "infra/",
  ];
  if (!roots.some((prefix) => rel.startsWith(prefix))) return false;
  if (rel.startsWith("apps/web/public/")) return false;
  if (rel.includes("/assets/")) return false;
  return true;
}

function enforceDynamicEngineBoundary(rel, text) {
  if (rel.startsWith("apps/web/src/features/") && text.includes("/game-registry.json")) {
    violations.push(
      `${rel}: runtime feature reads the generated registry; use the published Convex catalog or pinned manifest`,
    );
  }
  if (rel.startsWith("apps/web/src/frame/styles/") && text.includes("[data-control-id")) {
    violations.push(
      `${rel}: frame styling targets a game action id; style semantic kind/face/zone contracts instead`,
    );
  }
  if (rel.startsWith("apps/web/src/frame/") && text.includes("legacySemanticButtonLabel")) {
    violations.push(`${rel}: frame runtime contains a legacy game-action label map`);
  }
}

function extractImports(text) {
  const imports = new Set();
  for (const match of text.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)) {
    imports.add(match[2]);
  }
  for (const match of text.matchAll(/\bimport\s+(["'])([^"']+)\1/g)) {
    imports.add(match[2]);
  }
  return imports;
}

function enforceGameIsolation(rel, specifier, path) {
  if (!rel.startsWith("games/")) return;
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
  if (!specifier.startsWith(".")) return;
  const resolved = toRelative(resolve(dirname(path), specifier));
  const gameId = rel.split("/")[1];
  if (resolved.startsWith("games/") && !resolved.startsWith(`games/${gameId}/`)) {
    violations.push(`${rel}: game slice imports sibling game implementation ${specifier}`);
  }
}

function enforcePlatformIsolation(rel, specifier) {
  const concreteGamePackage =
    specifier.startsWith("@play-together/game-") && specifier !== "@play-together/game-sdk";
  if (rel.startsWith("apps/web/") && (specifier.includes("/games/") || concreteGamePackage)) {
    violations.push(`${rel}: web host statically imports a game ${specifier}`);
  }
  if (rel.startsWith("apps/realtime/") && (specifier.includes("/games/") || concreteGamePackage)) {
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

function enforcePackageEsmImports(rel, specifier) {
  if (!rel.startsWith("packages/") || !specifier.startsWith(".")) return;
  if (!specifier.endsWith(".js") && !specifier.endsWith(".json")) {
    violations.push(
      `${rel}: emitted Node ESM package import must use an explicit .js/.json extension: ${specifier}`,
    );
  }
}

function enforceWebVerticalSlices(rel, specifier, path) {
  if (!specifier.startsWith(".")) return;
  const resolved = toRelative(resolve(dirname(path), specifier));
  const sharedPrefix = "apps/web/src/shared/";
  const framePrefix = "apps/web/src/frame/";
  const featurePrefix = "apps/web/src/features/";

  if (rel.startsWith(sharedPrefix) && resolved.startsWith(featurePrefix)) {
    violations.push(`${rel}: shared layer imports feature implementation ${specifier}`);
  }
  if (rel.startsWith(framePrefix) && resolved.startsWith(featurePrefix)) {
    violations.push(`${rel}: isolated game frame imports feature implementation ${specifier}`);
  }
  if (!rel.startsWith(featurePrefix) || !resolved.startsWith(featurePrefix)) return;
  const owner = rel.slice(featurePrefix.length).split("/")[0];
  const importedOwner = resolved.slice(featurePrefix.length).split("/")[0];
  if (owner !== importedOwner) {
    violations.push(
      `${rel}: feature ${owner} imports sibling feature ${importedOwner}; promote true shared contracts/primitives instead`,
    );
  }
}

function toRelative(path) {
  return relative(root, path).replaceAll("\\", "/");
}

await walk(root);
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(
  `Architecture boundaries: OK (vertical slices + ${MAX_MAINTAINED_LINES}-line maintained-source budget)`,
);
