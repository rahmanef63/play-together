import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".local", ".turbo", "coverage", "dist", "node_modules", "var"]);
const sourceExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const failures = [];
const forbiddenPrivateKeyMarker = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
const executableRoots = ["apps/", "convex/", "games/", "packages/"];

await walk(root);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Security source scan: OK");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    const rel = relative(root, path).replaceAll("\\", "/");
    if (rel === ".env" || (rel.startsWith(".env.") && rel !== ".env.example")) continue;
    if (!sourceExtensions.has(extname(entry.name)) || rel === "scripts/security-check.mjs")
      continue;
    const text = await readFile(path, "utf8");
    if (text.includes(forbiddenPrivateKeyMarker)) {
      failures.push(`${rel}: embedded private key material`);
    }
    if (executableRoots.some((prefix) => rel.startsWith(prefix))) {
      if (/\beval\s*\(/.test(text) || /new\s+Function\s*\(/.test(text)) {
        failures.push(`${rel}: dynamic string execution is forbidden`);
      }
      if (/https?:\/\/[^\s"']+:[^\s"']+@/.test(text)) {
        failures.push(`${rel}: credential-bearing URL is forbidden`);
      }
    }
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(
        /\b(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|JOIN_TICKET_SECRET|GAME_PUBLISH_TOKEN)\s*=\s*(["']?)([^"'\s]+)\1/,
      );
      if (!match) continue;
      const value = match[2] ?? "";
      const allowed =
        value === "" ||
        value.startsWith("${") ||
        value.startsWith("process.env") ||
        value.includes("REDACTED") ||
        value.includes("example") ||
        value.includes("minimum");
      if (!allowed && value.length >= 16) failures.push(`${rel}: possible embedded credential`);
    }
  }
}
