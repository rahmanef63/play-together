import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(root, "apps/web/public/engine-vendors");
const catalog = JSON.parse(await readFile(resolve(root, "config/engine-vendors.json"), "utf8"));
if (catalog.schemaVersion !== 1 || !catalog.vendors?.three) {
  throw new Error("config/engine-vendors.json is invalid");
}
const webPackage = JSON.parse(await readFile(resolve(root, "apps/web/package.json"), "utf8"));
const installedThree = webPackage.dependencies?.three;
const manifest = { schemaVersion: 1, vendors: {} };
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const [runtimeVersion, entry] of Object.entries(catalog.vendors.three)) {
  if (installedThree !== entry.packageVersion) {
    throw new Error(
      `Web engine must depend on three@${entry.packageVersion}; found ${installedThree ?? "none"}`,
    );
  }
  const usedExports = await discoverThreeExports(runtimeVersion);
  const allowed = new Set(entry.exports ?? []);
  const missing = usedExports.filter((name) => !allowed.has(name));
  if (missing.length) {
    throw new Error(
      `Three runtime ${runtimeVersion} is missing exports: ${missing.join(", ")}. Create a new engine surface revision instead of mutating this one.`,
    );
  }
  const fileName = entry.url.split("/").pop();
  if (!fileName) throw new Error(`Invalid Three vendor URL for ${runtimeVersion}`);
  const output = resolve(outputRoot, fileName);
  await build({
    stdin: {
      contents: `export { ${entry.exports.join(", ")} } from "three";`,
      resolveDir: resolve(root, "apps/web"),
      sourcefile: `engine-vendor-three-${runtimeVersion}.ts`,
    },
    outfile: output,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    legalComments: "none",
    logLevel: "warning",
  });
  const bytes = await readFile(output);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (entry.sha256 && entry.sha256 !== sha256) {
    throw new Error(
      `Immutable engine vendor changed for three@${runtimeVersion}: expected ${entry.sha256}, got ${sha256}`,
    );
  }
  manifest.vendors.three = {
    version: runtimeVersion,
    packageVersion: entry.packageVersion,
    url: entry.url,
    sha256,
    bytes: bytes.byteLength,
    exports: entry.exports,
  };
  console.log(
    `engine-vendor three@${runtimeVersion}: ${bytes.byteLength} bytes, ${entry.exports.length} exports`,
  );
}
await writeFile(resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

async function discoverThreeExports(runtimeVersion) {
  const names = new Set();
  for (const gameName of await readdir(resolve(root, "games"))) {
    const gameRoot = resolve(root, "games", gameName);
    let config;
    try {
      config = JSON.parse(await readFile(resolve(gameRoot, "game.config.json"), "utf8"));
    } catch {
      continue;
    }
    if (config.runtimeDependencies?.three !== runtimeVersion) continue;
    for (const source of await sourceFiles(resolve(gameRoot, "src"))) {
      const text = await readFile(source, "utf8");
      for (const match of text.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s+["']three["']/g)) {
        const alias = match[1];
        if (!alias) continue;
        const usage = new RegExp(`\\b${alias}\\.([A-Za-z_$][\\w$]*)`, "g");
        for (const used of text.matchAll(usage)) if (used[1]) names.add(used[1]);
      }
      for (const match of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']three["']/g)) {
        for (const item of (match[1] ?? "").split(",")) {
          const original = item
            .trim()
            .replace(/^type\s+/, "")
            .split(/\s+as\s+/)[0]
            ?.trim();
          if (original) names.add(original);
        }
      }
    }
  }
  return [...names].sort();
}

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}
