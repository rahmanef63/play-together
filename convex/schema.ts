import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  games: defineTable({
    gameId: v.string(),
    version: v.string(),
    title: v.string(),
    description: v.string(),
    manifestUrl: v.string(),
    manifestSha256: v.string(),
    minPlayers: v.number(),
    maxPlayers: v.number(),
    modes: v.array(v.union(v.literal("shared-screen"), v.literal("handheld"))),
    supportsRemote: v.boolean(),
    supportsHandheld: v.boolean(),
    preferredOrientation: v.optional(
      v.union(v.literal("portrait"), v.literal("landscape"), v.literal("adaptive")),
    ),
    remoteDisplayMode: v.optional(v.union(v.literal("shared"), v.literal("per-player"))),
    maxViewports: v.optional(v.number()),
    status: v.union(v.literal("published"), v.literal("retired"), v.literal("blocked")),
    retirementReason: v.optional(v.string()),
    statusChangedAt: v.optional(v.number()),
    publishedAt: v.number(),
  })
    .index("by_game_version", ["gameId", "version"])
    .index("by_status", ["status"]),
  rooms: defineTable({
    code: v.string(),
    name: v.string(),
    hostUserId: v.id("users"),
    hostName: v.string(),
    gameId: v.string(),
    gameVersion: v.string(),
    gameTitle: v.string(),
    manifestUrl: v.string(),
    manifestSha256: v.string(),
    gameModes: v.optional(v.array(v.union(v.literal("shared-screen"), v.literal("handheld")))),
    supportsRemote: v.optional(v.boolean()),
    supportsHandheld: v.optional(v.boolean()),
    preferredOrientation: v.optional(
      v.union(v.literal("portrait"), v.literal("landscape"), v.literal("adaptive")),
    ),
    remoteDisplayMode: v.optional(v.union(v.literal("shared"), v.literal("per-player"))),
    maxViewports: v.optional(v.number()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    passwordHash: v.optional(v.string()),
    maxPlayers: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    playState: v.optional(v.union(v.literal("lobby"), v.literal("playing"))),
    sessionStartedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_visibility_status", ["visibility", "status"])
    .index("by_host", ["hostUserId"]),
  roomMembers: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    displayName: v.string(),
    status: v.union(v.literal("active"), v.literal("left")),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_user", ["userId"]),
  rateLimits: defineTable({
    key: v.string(),
    windowStartedAt: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
  gameTemplates: defineTable({
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
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("retired")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_slug_version", ["slug", "version"])
    .index("by_status", ["status"])
    .index("by_preview_game", ["previewGameId", "previewGameVersion"]),
  templatePurchases: defineTable({
    orderRef: v.string(),
    email: v.string(),
    templateId: v.id("gameTemplates"),
    status: v.union(v.literal("pending"), v.literal("granted")),
    entitlementId: v.optional(v.id("templateEntitlements")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order_ref", ["orderRef"])
    .index("by_email_status", ["email", "status"]),
  templateEntitlements: defineTable({
    templateId: v.id("gameTemplates"),
    userId: v.id("users"),
    source: v.union(v.literal("admin"), v.literal("purchase")),
    orderRef: v.optional(v.string()),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user_template", ["userId", "templateId"])
    .index("by_template", ["templateId"])
    .index("by_user", ["userId"]),
});
