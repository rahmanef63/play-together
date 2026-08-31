import type { QueryCtx } from "../../_generated/server";
import { requireQueryUser } from "../guards";

export async function listPublishedTemplates(ctx: QueryCtx) {
  const templates = await ctx.db
    .query("gameTemplates")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .take(200);
  return templates
    .map((template) => ({
      id: template._id,
      slug: template.slug,
      version: template.version,
      title: template.title,
      summary: template.summary,
      previewGameId: template.previewGameId,
      previewGameVersion: template.previewGameVersion,
      priceMinor: template.priceMinor,
      currency: template.currency,
      licenseId: template.licenseId,
      purchaseUrl: template.purchaseUrl,
      updatedAt: template.updatedAt,
    }))
    .sort((a, b) => a.title.localeCompare(b.title) || b.version.localeCompare(a.version));
}

export async function listOwnedTemplates(ctx: QueryCtx) {
  const userId = await requireQueryUser(ctx);
  const entitlements = await ctx.db
    .query("templateEntitlements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const now = Date.now();
  const active = entitlements.filter(
    (entitlement) => entitlement.expiresAt === undefined || entitlement.expiresAt > now,
  );
  const rows = await Promise.all(
    active.map(async (entitlement) => {
      const template = await ctx.db.get("gameTemplates", entitlement.templateId);
      if (!template) return null;
      return {
        entitlementId: entitlement._id,
        templateId: template._id,
        slug: template.slug,
        version: template.version,
        title: template.title,
        licenseId: template.licenseId,
        grantedAt: entitlement.grantedAt,
        expiresAt: entitlement.expiresAt,
      };
    }),
  );
  return rows.filter((row) => row !== null);
}
