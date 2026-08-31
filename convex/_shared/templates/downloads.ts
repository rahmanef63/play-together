import type { TemplateDownloadClaims } from "@play-together/contracts";
import type { FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx, QueryCtx } from "../../_generated/server";
import { requireActionUser } from "../guards";
import { signTemplateDownloadTicket } from "../templateDownloadTicket";
import type { DownloadableTemplate } from "./types";

const downloadableRef = internal.templates.getDownloadableInternal as unknown as FunctionReference<
  "query",
  "internal",
  { templateId: Id<"gameTemplates">; userId: Id<"users">; now: number } & Record<string, unknown>,
  DownloadableTemplate | null
>;

export async function issueTemplateDownload(
  ctx: ActionCtx,
  args: { templateId: Id<"gameTemplates"> },
) {
  const userId = await requireActionUser(ctx);
  const downloadable = await ctx.runQuery(downloadableRef, {
    templateId: args.templateId,
    userId,
    now: Date.now(),
  });
  if (!downloadable)
    throw new ConvexError({ code: "NOT_ENTITLED", message: "Template access is unavailable" });
  await ctx.runMutation(internal.security.consumeRateLimit, {
    key: `template-download:${userId}:${args.templateId}`,
    max: 20,
    windowMs: 60 * 60_000,
  });
  const secret = process.env.TEMPLATE_DOWNLOAD_SECRET;
  if (!secret)
    throw new ConvexError({
      code: "SERVER_MISCONFIGURED",
      message: "Template downloads are unavailable",
    });
  const now = Math.floor(Date.now() / 1000);
  const claims: TemplateDownloadClaims = {
    iss: "play-together",
    aud: "play-together-template-download",
    sub: String(userId),
    templateId: String(args.templateId),
    slug: downloadable.slug,
    blobPath: downloadable.sourceBlobPath,
    fileName: `${downloadable.slug}-${downloadable.version}.tar.gz`,
    iat: now,
    exp: now + 2 * 60,
    jti: crypto.randomUUID(),
  };
  return {
    url: `/api/templates/download?ticket=${encodeURIComponent(await signTemplateDownloadTicket(claims, secret))}`,
    expiresAt: claims.exp * 1000,
  };
}

export async function getDownloadableTemplate(
  ctx: QueryCtx,
  args: { templateId: Id<"gameTemplates">; userId: Id<"users">; now: number },
): Promise<DownloadableTemplate | null> {
  const template = await ctx.db.get("gameTemplates", args.templateId);
  if (template?.status !== "published") return null;
  const entitlement = await ctx.db
    .query("templateEntitlements")
    .withIndex("by_user_template", (q) =>
      q.eq("userId", args.userId).eq("templateId", args.templateId),
    )
    .unique();
  if (!entitlement || (entitlement.expiresAt !== undefined && entitlement.expiresAt <= args.now))
    return null;
  return {
    slug: template.slug,
    version: template.version,
    sourceBlobPath: template.sourceBlobPath,
    sourceSha256: template.sourceSha256,
    sourceBytes: template.sourceBytes,
  };
}
