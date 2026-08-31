import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const guideSource = resolve(root, "docs/submitting-games.md");
const promptSource = resolve(root, "docs/game-submission-prompt.txt");
const outputDir = resolve(root, "apps/web/public/docs");
const prompt = (await readFile(promptSource, "utf8")).trim();
if (prompt.length < 500) throw new Error("Submission prompt is unexpectedly short");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  copyFile(guideSource, resolve(outputDir, "submitting-games.md")),
  writeFile(resolve(outputDir, "submitting-games.prompt.txt"), `${prompt}\n`),
]);
console.log(`Synced submission docs (${prompt.length} prompt chars)`);
