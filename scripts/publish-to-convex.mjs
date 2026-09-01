import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { retryManifestFetch } from "./publish-to-convex/retry.mjs";

const requestedIds = new Set(process.argv.slice(2));
const environment = await loadEnvironment(resolve(process.cwd(), ".env"));
const deploymentUrl =
  process.env.CONVEX_URL ||
  process.env.VITE_CONVEX_URL ||
  process.env.CONVEX_SELF_HOSTED_URL ||
  environment.CONVEX_URL ||
  environment.VITE_CONVEX_URL ||
  environment.CONVEX_SELF_HOSTED_URL;
const publishToken = process.env.GAME_PUBLISH_TOKEN || environment.GAME_PUBLISH_TOKEN;
const cdnOrigin = process.env.GAME_CDN_PUBLIC_ORIGIN || environment.GAME_CDN_PUBLIC_ORIGIN;
if (!deploymentUrl || !publishToken || !cdnOrigin) {
  throw new Error(
    "CONVEX_URL (or VITE_CONVEX_URL), GAME_PUBLISH_TOKEN, and GAME_CDN_PUBLIC_ORIGIN are required",
  );
}
const catalog = JSON.parse(await readFile(resolve("releases/game-cdn/catalog.json"), "utf8"));
const releases = catalog.games.filter(
  (entry) => requestedIds.size === 0 || requestedIds.has(entry.gameId),
);
if (!releases.length) {
  throw new Error(
    requestedIds.size ? "No requested game release was found" : "No built game release was found",
  );
}
const missing = [...requestedIds].filter(
  (id) => !releases.some((release) => release.gameId === id),
);
if (missing.length) throw new Error(`No built release found for: ${missing.join(", ")}`);

const client = new ConvexHttpClient(deploymentUrl);
for (const release of releases) {
  const manifestPath = resolve(`releases/game-cdn${release.manifestPath}`);
  const manifestBytes = await readFile(manifestPath);
  const digest = createHash("sha256").update(manifestBytes).digest("hex");
  if (digest !== release.manifestSha256) {
    throw new Error(`Catalog digest mismatch for ${release.gameId}@${release.version}`);
  }
  const presentation = await presentationForRelease(release);
  await retryManifestFetch(() =>
    client.action(makeFunctionReference("games:publish"), {
      manifestUrl: new URL(release.manifestPath, `${cdnOrigin.replace(/\/$/, "")}/`).toString(),
      manifestSha256: digest,
      publishToken,
      remoteDisplayMode: presentation.mode,
      maxViewports: presentation.maxViewports,
    }),
  );
  console.log(`Published ${release.gameId}@${release.version} to Convex`);
}

async function loadEnvironment(path) {
  const values = {};
  try {
    const content = await readFile(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.trimStart().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index < 1) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  } catch {}
  return values;
}

async function presentationForRelease(release) {
  const catalogPolicy = normalizePresentation(release.presentation?.remoteDisplay);
  if (catalogPolicy) return catalogPolicy;
  try {
    const config = JSON.parse(
      await readFile(resolve(`games/${release.gameId}/game.config.json`), "utf8"),
    );
    if (config?.game?.version === release.version) {
      return (
        normalizePresentation(config.presentation?.remoteDisplay) ?? {
          mode: "shared",
          maxViewports: 1,
        }
      );
    }
  } catch {}
  return { mode: "shared", maxViewports: 1 };
}

function normalizePresentation(value) {
  if (!value || typeof value !== "object") return null;
  if (value.mode !== "per-player") return { mode: "shared", maxViewports: 1 };
  const count = Number.isInteger(value.maxViewports) ? value.maxViewports : 1;
  return { mode: "per-player", maxViewports: Math.max(1, Math.min(4, count)) };
}
