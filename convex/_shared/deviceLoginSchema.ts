import { defineTable } from "convex/server";
import { v } from "convex/values";

export const deviceLoginTables = {
  deviceLogins: defineTable({
    codeHash: v.string(),
    proofHash: v.string(),
    label: v.string(),
    state: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("consumed"),
      v.literal("cancelled"),
    ),
    approvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastPollAt: v.number(),
  })
    .index("by_code", ["codeHash"])
    .index("by_expiry", ["expiresAt"]),
};
