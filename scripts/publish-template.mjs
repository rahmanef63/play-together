import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const metadataArg = process.argv[2];
if (!metadataArg) throw new Error("Usage: pnpm template:publish <metadata.json>");
const metadata = JSON.parse(await readFile(resolve(metadataArg), "utf8"));
const deploymentUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
const publishToken = process.env.TEMPLATE_PUBLISH_TOKEN;
if (!deploymentUrl || !publishToken)
  throw new Error("CONVEX_URL and TEMPLATE_PUBLISH_TOKEN are required");
const result = await new ConvexHttpClient(deploymentUrl).action(
  makeFunctionReference("templates:publish"),
  {
    slug: metadata.slug,
    version: metadata.version,
    title: metadata.title,
    summary: metadata.summary,
    previewGameId: metadata.previewGameId,
    previewGameVersion: metadata.previewGameVersion,
    sourceBlobPath: metadata.sourceBlobPath,
    sourceSha256: metadata.sourceSha256,
    sourceBytes: metadata.sourceBytes,
    priceMinor: metadata.priceMinor,
    currency: String(metadata.currency).toUpperCase(),
    licenseId: metadata.licenseId,
    ...(metadata.purchaseUrl ? { purchaseUrl: metadata.purchaseUrl } : {}),
    status: "published",
    publishToken,
  },
);
console.log(
  JSON.stringify({
    published: true,
    templateId: String(result),
    slug: metadata.slug,
    version: metadata.version,
  }),
);
