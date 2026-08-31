import type { FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../../_generated/server";
import type { TemplatePublicationArgs, TemplateRecordArgs } from "./types";
import {
  cleanText,
  normalizePurchaseUrl,
  validateCommercialFields,
  validateTemplateIdentity,
  validateTemplateSource,
} from "./validation";

const upsertRef = internal.templates.upsertInternal as unknown as FunctionReference<
  "mutation",
  "internal",
  TemplateRecordArgs & Record<string, unknown>,
  Id<"gameTemplates">
>;

export async function publishTemplate(
  ctx: ActionCtx,
  args: TemplatePublicationArgs,
): Promise<Id<"gameTemplates">> {
  const expectedToken = process.env.TEMPLATE_PUBLISH_TOKEN;
  if (!expectedToken || args.publishToken !== expectedToken)
    throw new ConvexError({ code: "FORBIDDEN", message: "Invalid template publication token" });
  const { slug, version } = validateTemplateIdentity(args.slug, args.version);
  validateTemplateSource(args.sourceBlobPath, args.sourceSha256, args.sourceBytes);
  const preview = await ctx.runQuery(internal.games.getPublishedInternal, {
    gameId: args.previewGameId,
    version: args.previewGameVersion,
  });
  if (!preview)
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "Template preview game is unavailable",
    });
  if (args.status === "published") validateCommercialFields(args);
  const priceMinor = args.priceMinor;
  const currency = args.currency?.trim().toUpperCase();
  const licenseId = args.licenseId?.trim();
  const purchaseUrl = normalizePurchaseUrl(args.purchaseUrl);
  return ctx.runMutation(upsertRef, {
    slug,
    version,
    title: cleanText(args.title, 80, "title"),
    summary: cleanText(args.summary, 500, "summary"),
    previewGameId: args.previewGameId,
    previewGameVersion: args.previewGameVersion,
    sourceBlobPath: args.sourceBlobPath,
    sourceSha256: args.sourceSha256.toLowerCase(),
    sourceBytes: args.sourceBytes,
    ...(priceMinor !== undefined ? { priceMinor } : {}),
    ...(currency ? { currency } : {}),
    ...(licenseId ? { licenseId } : {}),
    ...(purchaseUrl ? { purchaseUrl } : {}),
    status: args.status,
  });
}

export async function upsertTemplate(ctx: MutationCtx, args: TemplateRecordArgs) {
  const existing = await ctx.db
    .query("gameTemplates")
    .withIndex("by_slug_version", (q) => q.eq("slug", args.slug).eq("version", args.version))
    .unique();
  if (existing?.status === "published" && existing.sourceSha256 !== args.sourceSha256) {
    throw new ConvexError({
      code: "IMMUTABLE_TEMPLATE_VERSION",
      message: "Published template source cannot be replaced; publish a new version",
    });
  }
  const now = Date.now();
  const record = { ...args, createdAt: existing?.createdAt ?? now, updatedAt: now };
  if (existing) {
    await ctx.db.patch(existing._id, record);
    return existing._id;
  }
  return ctx.db.insert("gameTemplates", record);
}
