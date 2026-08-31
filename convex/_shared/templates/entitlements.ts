import type { MutationCtx } from "../../_generated/server";
import { requireMutationUser } from "../guards";
import type { EntitlementArgs } from "./types";

export async function grantEntitlement(ctx: MutationCtx, args: EntitlementArgs) {
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
}

export async function claimPendingPurchases(ctx: MutationCtx) {
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
    if (template?.status !== "published") continue;
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
    if (existing)
      await ctx.db.patch(existing._id, { source: "purchase", orderRef: purchase.orderRef });
    await ctx.db.patch(purchase._id, { status: "granted", entitlementId, updatedAt: Date.now() });
    claimed += 1;
  }
  return { claimed };
}
