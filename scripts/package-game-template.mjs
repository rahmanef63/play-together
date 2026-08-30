import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [slugArg, ...flags] = process.argv.slice(2);
if (!slugArg || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(slugArg)) {
  throw new Error("Usage: pnpm template:pack <slug> [--upload]");
}
const upload = flags.includes("--upload");
const root = process.cwd();
const sourceRoot = resolve(root, "template-sources", slugArg);
const sourceDir = resolve(sourceRoot, "source");
const configPath = resolve(sourceRoot, "template.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
validateConfig(config, slugArg);
await assertSafeTree(sourceDir);

const packageRoot = resolve(root, ".local/template-packages");
const stage = resolve(packageRoot, `.stage-${slugArg}-${process.pid}`);
const archiveName = `${slugArg}-${config.version}.tar.gz`;
const archivePath = resolve(packageRoot, archiveName);
await mkdir(packageRoot, { recursive: true, mode: 0o700 });
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true, mode: 0o700 });
await cp(sourceDir, resolve(stage, slugArg), {
  recursive: true,
  errorOnExist: false,
  force: false,
});
await writeFile(
  resolve(stage, "TEMPLATE-METADATA.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      slug: config.slug,
      version: config.version,
      title: config.title,
      previewGameId: config.previewGameId,
      previewGameVersion: config.previewGameVersion,
      licenseId: config.licenseId,
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
execFileSync("tar", ["-czf", archivePath, "-C", stage, "."], { stdio: "ignore" });
await rm(stage, { recursive: true, force: true });

const bytes = await readFile(archivePath);
if (bytes.byteLength > 512 * 1024 * 1024) throw new Error("Template archive exceeds 512 MB policy");
const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
const blobPath = `templates/${slugArg}/${config.version}/${archiveName}`;
const metadata = {
  ...config,
  sourceBlobPath: blobPath,
  sourceSha256,
  sourceBytes: bytes.byteLength,
  localArchive: archivePath,
};

if (upload) {
  const { put } = await import("@vercel/blob");
  const result = await put(blobPath, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/gzip",
    cacheControlMaxAge: 60,
  });
  metadata.blobUrl = result.url;
}

const metadataPath = resolve(packageRoot, `${slugArg}-${config.version}.json`);
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
console.log(
  JSON.stringify({
    slug: metadata.slug,
    version: metadata.version,
    sourceBlobPath: metadata.sourceBlobPath,
    sourceSha256: metadata.sourceSha256,
    sourceBytes: metadata.sourceBytes,
    uploaded: upload,
    metadataPath,
  }),
);

function validateConfig(value, expectedSlug) {
  if (!value || typeof value !== "object") throw new Error("template.json must be an object");
  if (value.slug !== expectedSlug) throw new Error("template.json slug must match its directory");
  for (const key of [
    "version",
    "title",
    "summary",
    "previewGameId",
    "previewGameVersion",
    "licenseId",
  ]) {
    if (typeof value[key] !== "string" || !value[key].trim())
      throw new Error(`template.json ${key} is required`);
  }
  if (!Number.isInteger(value.priceMinor) || value.priceMinor < 0)
    throw new Error("priceMinor must be a non-negative integer");
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/i.test(value.currency))
    throw new Error("currency must be ISO-4217");
  if (value.purchaseUrl !== undefined) {
    const url = new URL(value.purchaseUrl);
    if (url.protocol !== "https:") throw new Error("purchaseUrl must use HTTPS");
  }
}

async function assertSafeTree(directory) {
  const forbiddenNames =
    /(^|\/)(\.env($|\.)|\.git($|\/)|node_modules($|\/)|dist($|\/)|build($|\/)|coverage($|\/)|\.next($|\/)|\.turbo($|\/)|\.vercel($|\/)|id_rsa|id_ed25519|credentials?|secrets?)(\/|$)/i;
  const keyFile = /\.(pem|p12|pfx|key)$/i;
  const secretText = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|re)_[A-Za-z0-9_-]{20,}\b)/;
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const relative = path.slice(directory.length + 1).replaceAll("\\", "/");
      if (forbiddenNames.test(relative) || keyFile.test(entry.name))
        throw new Error(`Unsafe template file: ${relative}`);
      const info = await lstat(path);
      if (info.isSymbolicLink())
        throw new Error(`Symlinks are not allowed in template source: ${relative}`);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        if (info.size > 100 * 1024 * 1024)
          throw new Error(`Template file exceeds 100 MB policy: ${relative}`);
        if (info.size <= 2 * 1024 * 1024) {
          const content = await readFile(path, "utf8").catch(() => "");
          if (secretText.test(content))
            throw new Error(`Possible credential detected in template source: ${relative}`);
        }
      }
    }
  };
  const rootInfo = await stat(directory);
  if (!rootInfo.isDirectory()) throw new Error("template source/ directory is required");
  await walk(directory);
}
