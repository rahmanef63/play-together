import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const gameRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(gameRoot, "assets/source/generated-2026-08-31");
const manifestPath = resolve(sourceRoot, "source-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.sheets)) {
  throw new Error("Turbo asset source manifest has an unsupported shape");
}

for (const sheet of manifest.sheets) {
  const path = resolve(sourceRoot, sheet.file);
  const bytes = await readFile(path);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sheet.sha256) throw new Error(`${sheet.file}: SHA-256 mismatch`);
  const size = readPngSize(bytes);
  if (size.width !== sheet.width || size.height !== sheet.height) {
    throw new Error(
      `${sheet.file}: expected ${sheet.width}x${sheet.height}, got ${size.width}x${size.height}`,
    );
  }
  if (sheet.slicing?.fixedGrid !== false) {
    throw new Error(`${sheet.file}: generated source sheets must not assume a fixed crop grid`);
  }
}

console.log(`Turbo asset sources: ${manifest.sheets.length} sheets verified`);

function readPngSize(bytes) {
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature) throw new Error("Not a PNG source asset");
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") throw new Error("PNG IHDR is missing");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
