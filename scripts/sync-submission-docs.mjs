import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "docs/submitting-games.md");
const outputDir = resolve(root, "apps/web/public/docs");
const markdown = await readFile(source, "utf8");
const heading = "## Base prompt for an AI coding agent";
const headingIndex = markdown.indexOf(heading);
if (headingIndex < 0) throw new Error(`Missing ${heading}`);
const fenceStart = markdown.indexOf("```text", headingIndex);
if (fenceStart < 0) throw new Error("Missing text code fence for submission prompt");
const contentStart = fenceStart + "```text".length;
const fenceEnd = markdown.indexOf("\n```", contentStart);
if (fenceEnd < 0) throw new Error("Submission prompt code fence is not closed");
const prompt = markdown.slice(contentStart, fenceEnd).trim();
if (prompt.length < 500) throw new Error("Submission prompt is unexpectedly short");

await mkdir(outputDir, { recursive: true });
await copyFile(source, resolve(outputDir, "submitting-games.md"));
await writeFile(resolve(outputDir, "submitting-games.prompt.txt"), `${prompt}\n`);
console.log(`Synced submission docs (${prompt.length} prompt chars)`);
