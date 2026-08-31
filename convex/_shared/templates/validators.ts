import { v } from "convex/values";

export const templateStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("retired"),
);
export const publicationArgs = {
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
export const templateRecordArgs = {
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
};
export const entitlementArgs = {
  templateId: v.id("gameTemplates"),
  userId: v.id("users"),
  source: v.union(v.literal("admin"), v.literal("purchase")),
  orderRef: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
};
export const purchaseArgs = {
  email: v.string(),
  slug: v.string(),
  version: v.string(),
  orderRef: v.string(),
};
export const downloadableArgs = {
  templateId: v.id("gameTemplates"),
  userId: v.id("users"),
  now: v.number(),
};
