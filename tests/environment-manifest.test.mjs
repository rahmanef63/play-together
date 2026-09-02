import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  environmentVariableNames,
  environmentVariables,
} from "../scripts/environment-manifest.mjs";

const SYSTEM_ENVIRONMENT = new Set(["HOME", "NODE_ENV", "PROD", "DEV", "MODE", "BASE_URL"]);
const SOURCE_ROOTS = ["apps", "api", "convex", "packages", "scripts", "infra", "e2e", ".github"];

const scopes = {
  local: new Set(["local", "both", "runtime", "tooling"]),
  production: new Set(["production", "both", "runtime", "tooling", "ci"]),
};

describe("environment manifest", () => {
  it("owns every project environment name once", () => {
    expect(environmentVariableNames.size).toBe(environmentVariables.length);
    expect(environmentVariables.length).toBeGreaterThan(60);
  });

  it("keeps generated templates aligned to manifest scopes", async () => {
    const all = await readExample(".env.all.example");
    const local = await readExample(".env.example");
    const production = await readExample(".env.production.example");
    expect(new Set(all.keys())).toEqual(environmentVariableNames);
    expect(new Set(local.keys())).toEqual(namesForScopes(scopes.local));
    expect(new Set(production.keys())).toEqual(namesForScopes(scopes.production));
    for (const item of environmentVariables.filter((entry) => entry.secret)) {
      expect(all.get(item.name), `${item.name} must remain a placeholder`).toMatch(/^</);
    }
  });

  it("declares every environment contract referenced by source, compose, turbo, or CI", async () => {
    const referenced = new Set();
    for (const root of SOURCE_ROOTS) await scanTree(root, referenced);
    const turbo = JSON.parse(await readFile("turbo.json", "utf8"));
    for (const name of turbo.globalPassThroughEnv ?? []) referenced.add(name);
    for (const name of referenced) {
      expect(
        environmentVariableNames.has(name) || SYSTEM_ENVIRONMENT.has(name),
        `${name} is referenced but missing from scripts/environment-manifest.mjs`,
      ).toBe(true);
    }
  });
});

function namesForScopes(allowed) {
  return new Set(
    environmentVariables.filter((item) => allowed.has(item.scope)).map((item) => item.name),
  );
}

async function readExample(path) {
  const content = await readFile(path, "utf8");
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!/^[A-Z][A-Z0-9_]*=/.test(line)) continue;
    const separator = line.indexOf("=");
    values.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return values;
}

async function scanTree(root, referenced) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (["node_modules", ".git", "dist", ".turbo"].includes(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await scanTree(path, referenced);
      continue;
    }
    let content;
    try {
      content = await readFile(path, "utf8");
    } catch {
      continue;
    }
    collect(content, /process\.env\.([A-Z][A-Z0-9_]*)/g, referenced);
    collect(content, /environment\.([A-Z][A-Z0-9_]*)/g, referenced);
    collect(content, /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g, referenced);
    if (/docker-compose.*\.ya?ml$/.test(path))
      collect(content, /\$\{([A-Z][A-Z0-9_]*)/g, referenced);
    collect(content, /secrets\.([A-Z][A-Z0-9_]*)/g, referenced);
  }
}

function collect(content, pattern, referenced) {
  for (const match of content.matchAll(pattern)) referenced.add(match[1]);
}
