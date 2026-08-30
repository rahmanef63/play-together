import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const version = packageJson.version;
if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("Root package version is not a valid semantic version");
}

const templatePath = resolve(root, "apps/web/public/sw.template.js");
const outputPath = resolve(root, "apps/web/public/sw.js");
const template = await readFile(templatePath, "utf8");
if (!template.includes("__APP_VERSION__"))
  throw new Error("PWA service-worker template has no version token");
await writeFile(outputPath, template.replaceAll("__APP_VERSION__", version));
await writeFile(
  resolve(root, "apps/web/public/version.json"),
  `${JSON.stringify({ version }, null, 2)}\n`,
);
console.log(`Stamped PWA assets for ${version}`);
