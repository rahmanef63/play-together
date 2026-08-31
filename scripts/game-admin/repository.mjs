import { spawnSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ROOT = process.cwd();
export function gameRoot(id) {
  return resolve(ROOT, "games", id);
}
export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
export async function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 28_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "unknown error").trim()}`,
    );
  return result.stdout.trim();
}
export async function refreshWorkspaceLinks() {
  await runCommand("pnpm", ["install", "--prefer-offline", "--ignore-scripts"]);
}
export async function readSubmissionPrompt() {
  return (await readFile(resolve(ROOT, "docs/game-submission-prompt.txt"), "utf8")).trim();
}
export async function readCatalog() {
  try {
    return await readJson(resolve(ROOT, "releases/game-cdn/catalog.json"));
  } catch {
    return { schemaVersion: 1, games: [] };
  }
}
