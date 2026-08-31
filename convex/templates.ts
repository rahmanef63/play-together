import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { listOwnedTemplates, listPublishedTemplates } from "./_shared/templates/catalog";
import { getDownloadableTemplate, issueTemplateDownload } from "./_shared/templates/downloads";
import {
  claimPendingPurchases as claimPendingHandler,
  grantEntitlement,
} from "./_shared/templates/entitlements";
import { publishTemplate, upsertTemplate } from "./_shared/templates/publication";
import { fulfillPurchase } from "./_shared/templates/purchases";
import {
  downloadableArgs,
  entitlementArgs,
  publicationArgs,
  purchaseArgs,
  templateRecordArgs,
} from "./_shared/templates/validators";

export const listPublished = query({ args: {}, handler: (ctx) => listPublishedTemplates(ctx) });
export const listMine = query({ args: {}, handler: (ctx) => listOwnedTemplates(ctx) });
export const publish = action({
  args: publicationArgs,
  handler: (ctx, args) => publishTemplate(ctx, args),
});
export const issueDownload = action({
  args: { templateId: v.id("gameTemplates") },
  handler: (ctx, args) => issueTemplateDownload(ctx, args),
});
export const upsertInternal = internalMutation({
  args: templateRecordArgs,
  handler: (ctx, args) => upsertTemplate(ctx, args),
});
export const grantEntitlementInternal = internalMutation({
  args: entitlementArgs,
  handler: (ctx, args) => grantEntitlement(ctx, args),
});
export const fulfillPurchaseInternal = internalMutation({
  args: purchaseArgs,
  handler: (ctx, args) => fulfillPurchase(ctx, args),
});
export const claimPendingPurchases = mutation({
  args: {},
  handler: (ctx) => claimPendingHandler(ctx),
});
export const getDownloadableInternal = internalQuery({
  args: downloadableArgs,
  handler: (ctx, args) => getDownloadableTemplate(ctx, args),
});
