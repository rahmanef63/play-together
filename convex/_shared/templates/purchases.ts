import { ConvexError } from "convex/values";
import type { MutationCtx } from "../../_generated/server";

export async function fulfillPurchase(
  ctx: MutationCtx,
  args: { email: string; slug: string; version: string; orderRef: string },
) {
  const email = args.email.trim().toLowerCase();
  const slug = args.slug.trim().toLowerCase();
  const version = args.version.trim();
  const orderRef = args.orderRef.trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ConvexError({ code: "INVALID_PURCHASE", message: "Buyer email is invalid" });
  if (!orderRef || orderRef.length > 160)
    throw new ConvexError({ code: "INVALID_PURCHASE", message: "Order reference is invalid" });
  const template = await ctx.db
    .query("gameTemplates")
    .withIndex("by_slug_version", (q) => q.eq("slug", slug).eq("version", version))
    .unique();
  if (template?.status !== "published")
    return { accepted: false as const, granted: false as const };
  const previous = await ctx.db
    .query("templatePurchases")
    .withIndex("by_order_ref", (q) => q.eq("orderRef", orderRef))
    .unique();
  if (previous) {
    if (previous.email !== email || previous.templateId !== template._id)
      throw new ConvexError({
        code: "ORDER_REFERENCE_CONFLICT",
        message: "Order reference is already associated with another purchase",
      });
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
  if (entitlement) await ctx.db.patch(entitlement._id, { source: "purchase", orderRef });
  await ctx.db.patch(purchaseId, { status: "granted", entitlementId, updatedAt: Date.now() });
  return { accepted: true as const, granted: true as const, purchaseId, entitlementId };
}
