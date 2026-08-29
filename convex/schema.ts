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
    status: v.union(v.literal("published"), v.literal("retired")),
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
    visibility: v.union(v.literal("public"), v.literal("private")),
    passwordHash: v.optional(v.string()),
    maxPlayers: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
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
});
