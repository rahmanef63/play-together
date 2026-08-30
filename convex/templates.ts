import type { TemplateDownloadClaims } from "@play-together/contracts";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireActionUser, requireMutationUser, requireQueryUser } from "./_shared/guards";
import { signTemplateDownloadTicket } from "./_shared/templateDownloadTicket";

const templateStatus = v.union(v.literal("draft"), v.literal("published"), v.literal("retired"));
const publicationArgs = {
  slug: v.string(),
  version: v.string(),
  title: v.string(),
  summary: v.string(),
  previewGameId: v.string(),
  previewGameVersion: v.string(),
  sourceBlobPath: v.string(),
  sourceSha256: v.string(),
  sourceBytes: v.number(),
  priceMinor: v.optional(v.number()),
  currency: v.optional(v.string()),
  licenseId: v.optional(v.string()),
  purchaseUrl: v.optional(v.string()),
  status: templateStatus,
  publishToken: v.string(),
};

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
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
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
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
  },
});

export const publish = action({
  args: publicationArgs,
  handler: async (ctx, args): Promise<Id<"gameTemplates">> => {
    const expectedToken = process.env.TEMPLATE_PUBLISH_TOKEN;
    if (!expectedToken || args.publishToken !== expectedToken) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid template publication token" });
    }
    const slug = args.slug.trim().toLowerCase();
    const version = args.version.trim();
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) {
      throw new ConvexError({ code: "INVALID_TEMPLATE", message: "Invalid template slug" });
    }
    if (!version || version.length > 64) {
      throw new ConvexError({ code: "INVALID_TEMPLATE", message: "Invalid template version" });
    }
    if (
      !/^templates\/[a-z0-9/_+.-]+$/i.test(args.sourceBlobPath) ||
      args.sourceBlobPath.includes("..")
    ) {
      throw new ConvexError({
        code: "INVALID_BLOB_PATH",
        message: "Invalid private template path",
      });
    }
    if (!/^[a-f0-9]{64}$/i.test(args.sourceSha256)) {
      throw new ConvexError({
        code: "INVALID_DIGEST",
        message: "Template source digest must be SHA-256",
      });
    }
    if (
      !Number.isInteger(args.sourceBytes) ||
      args.sourceBytes <= 0 ||
      args.sourceBytes > 512 * 1024 * 1024
    ) {
      throw new ConvexError({ code: "INVALID_SIZE", message: "Template source size is invalid" });
    }
    const preview = await ctx.runQuery(internal.games.getPublishedInternal, {
      gameId: args.previewGameId,
      version: args.previewGameVersion,
    });
    if (!preview) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Template preview game is unavailable",
      });
    }
    if (args.status === "published") validateCommercialFields(args);
    const priceMinor = args.priceMinor;
    const currency = args.currency?.trim().toUpperCase();
    const licenseId = args.licenseId?.trim();
    const purchaseUrl = normalizePurchaseUrl(args.purchaseUrl);
    return ctx.runMutation(internal.templates.upsertInternal, {
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
  },
});

export const issueDownload = action({
  args: { templateId: v.id("gameTemplates") },
  handler: async (ctx, args) => {
    const userId = await requireActionUser(ctx);
    const downloadable = await ctx.runQuery(internal.templates.getDownloadableInternal, {
      templateId: args.templateId,
      userId,
      now: Date.now(),
    });
    if (!downloadable) {
      throw new ConvexError({ code: "NOT_ENTITLED", message: "Template access is unavailable" });
    }
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `template-download:${userId}:${args.templateId}`,
      max: 20,
      windowMs: 60 * 60_000,
    });
    const secret = process.env.TEMPLATE_DOWNLOAD_SECRET;
    if (!secret) {
      throw new ConvexError({
        code: "SERVER_MISCONFIGURED",
        message: "Template downloads are unavailable",
      });
    }
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
      url: `/api/templates/download?ticket=${encodeURIComponent(
        await signTemplateDownloadTicket(claims, secret),
      )}`,
      expiresAt: claims.exp * 1000,
    };
  },
});

export const upsertInternal = internalMutation({
  args: {
    slug: v.string(),
    version: v.string(),
    title: v.string(),
    summary: v.string(),
    previewGameId: v.string(),
    previewGameVersion: v.string(),
    sourceBlobPath: v.string(),
    sourceSha256: v.string(),
    sourceBytes: v.number(),
    priceMinor: v.optional(v.number()),
    currency: v.optional(v.string()),
    licenseId: v.optional(v.string()),
    purchaseUrl: v.optional(v.string()),
    status: templateStatus,
  },
  handler: async (ctx, args) => {
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
  },
});

export const grantEntitlementInternal = internalMutation({
  args: {
    templateId: v.id("gameTemplates"),
    userId: v.id("users"),
    source: v.union(v.literal("admin"), v.literal("purchase")),
    orderRef: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templateEntitlements")
      .withIndex("by_user_template", (q) =>
        q.eq("userId", args.userId).eq("templateId", args.templateId),
      )
      .unique();
    const record = {
      templateId: args.templateId,
      userId: args.userId,
      source: args.source,
      ...(args.orderRef !== undefined ? { orderRef: args.orderRef } : {}),
      grantedAt: existing?.grantedAt ?? Date.now(),
      ...(args.expiresAt !== undefined ? { expiresAt: args.expiresAt } : {}),
    };
    if (existing) {
      await ctx.db.patch(existing._id, record);
      return existing._id;
    }
    return ctx.db.insert("templateEntitlements", record);
  },
});

export const fulfillPurchaseInternal = internalMutation({
  args: {
    email: v.string(),
    slug: v.string(),
    version: v.string(),
    orderRef: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const slug = args.slug.trim().toLowerCase();
    const version = args.version.trim();
    const orderRef = args.orderRef.trim();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError({ code: "INVALID_PURCHASE", message: "Buyer email is invalid" });
    }
    if (!orderRef || orderRef.length > 160) {
      throw new ConvexError({ code: "INVALID_PURCHASE", message: "Order reference is invalid" });
    }
    const template = await ctx.db
      .query("gameTemplates")
      .withIndex("by_slug_version", (q) => q.eq("slug", slug).eq("version", version))
      .unique();
    if (!template || template.status !== "published") {
      return { accepted: false as const, granted: false as const };
    }
    const previous = await ctx.db
      .query("templatePurchases")
      .withIndex("by_order_ref", (q) => q.eq("orderRef", orderRef))
      .unique();
    if (previous) {
      if (previous.email !== email || previous.templateId !== template._id) {
        throw new ConvexError({
          code: "ORDER_REFERENCE_CONFLICT",
          message: "Order reference is already associated with another purchase",
        });
      }
      return {
        accepted: true as const,
        granted: previous.status === "granted",
        purchaseId: previous._id,
      };
    }
    const now = Date.now();
    const purchaseId = await ctx.db.insert("templatePurchases", {
      orderRef,
      email,
      templateId: template._id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) return { accepted: true as const, granted: false as const, purchaseId };

    const entitlement = await ctx.db
      .query("templateEntitlements")
      .withIndex("by_user_template", (q) => q.eq("userId", user._id).eq("templateId", template._id))
      .unique();
    const entitlementId = entitlement
      ? entitlement._id
      : await ctx.db.insert("templateEntitlements", {
          templateId: template._id,
          userId: user._id,
          source: "purchase",
          orderRef,
          grantedAt: now,
        });
    if (entitlement) {
      await ctx.db.patch(entitlement._id, { source: "purchase", orderRef });
    }
    await ctx.db.patch(purchaseId, {
      status: "granted",
      entitlementId,
      updatedAt: Date.now(),
    });
    return { accepted: true as const, granted: true as const, purchaseId, entitlementId };
  },
});

export const claimPendingPurchases = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireMutationUser(ctx);
    const user = await ctx.db.get("users", userId);
    const email = user?.email?.trim().toLowerCase();
    if (!email) return { claimed: 0 };
    const pending = await ctx.db
      .query("templatePurchases")
      .withIndex("by_email_status", (q) => q.eq("email", email).eq("status", "pending"))
      .take(50);
    let claimed = 0;
    for (const purchase of pending) {
      const template = await ctx.db.get("gameTemplates", purchase.templateId);
      if (!template || template.status !== "published") continue;
      const existing = await ctx.db
        .query("templateEntitlements")
        .withIndex("by_user_template", (q) =>
          q.eq("userId", userId).eq("templateId", purchase.templateId),
        )
        .unique();
      const entitlementId = existing
        ? existing._id
        : await ctx.db.insert("templateEntitlements", {
            templateId: purchase.templateId,
            userId,
            source: "purchase",
            orderRef: purchase.orderRef,
            grantedAt: Date.now(),
          });
      if (existing) {
        await ctx.db.patch(existing._id, { source: "purchase", orderRef: purchase.orderRef });
      }
      await ctx.db.patch(purchase._id, {
        status: "granted",
        entitlementId,
        updatedAt: Date.now(),
      });
      claimed += 1;
    }
    return { claimed };
  },
});

export const getDownloadableInternal = internalQuery({
  args: { templateId: v.id("gameTemplates"), userId: v.id("users"), now: v.number() },
  handler: async (ctx, args) => {
    const template = await ctx.db.get("gameTemplates", args.templateId);
    if (!template || template.status !== "published") return null;
    const entitlement = await ctx.db
      .query("templateEntitlements")
      .withIndex("by_user_template", (q) =>
        q.eq("userId", args.userId).eq("templateId", args.templateId),
      )
      .unique();
    if (
      !entitlement ||
      (entitlement.expiresAt !== undefined && entitlement.expiresAt <= args.now)
    ) {
      return null;
    }
    return {
      slug: template.slug,
      version: template.version,
      sourceBlobPath: template.sourceBlobPath,
      sourceSha256: template.sourceSha256,
      sourceBytes: template.sourceBytes,
    };
  },
});

function validateCommercialFields(args: {
  priceMinor?: number;
  currency?: string;
  licenseId?: string;
}): void {
  if (!Number.isInteger(args.priceMinor) || (args.priceMinor ?? -1) < 0) {
    throw new ConvexError({ code: "INVALID_PRICE", message: "Published templates need a price" });
  }
  if (!/^[A-Z]{3}$/i.test(args.currency?.trim() ?? "")) {
    throw new ConvexError({ code: "INVALID_CURRENCY", message: "Currency must use ISO-4217 code" });
  }
  if (!args.licenseId?.trim()) {
    throw new ConvexError({
      code: "INVALID_LICENSE",
      message: "Published templates need a license",
    });
  }
}

function normalizePurchaseUrl(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  if (!cleaned) return undefined;
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    throw new ConvexError({ code: "INVALID_PURCHASE_URL", message: "Purchase URL is invalid" });
  }
  if (url.protocol !== "https:") {
    throw new ConvexError({ code: "INVALID_PURCHASE_URL", message: "Purchase URL must use HTTPS" });
  }
  return url.toString();
}

function cleanText(value: string, max: number, field: string): string {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > max) {
    throw new ConvexError({ code: "INVALID_TEMPLATE", message: `Template ${field} is invalid` });
  }
  return text;
}
