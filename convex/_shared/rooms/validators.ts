import { v } from "convex/values";

export const createRoomArgs = {
  name: v.string(),
  gameId: v.string(),
  gameVersion: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  password: v.optional(v.string()),
  maxPlayers: v.number(),
};
export const createRoomInternalArgs = {
  code: v.string(),
  name: v.string(),
  hostUserId: v.id("users"),
  gameId: v.string(),
  gameVersion: v.string(),
  gameTitle: v.string(),
  manifestUrl: v.string(),
  manifestSha256: v.string(),
  gameModes: v.array(v.union(v.literal("shared-screen"), v.literal("handheld"))),
  supportsRemote: v.boolean(),
  supportsHandheld: v.boolean(),
  preferredOrientation: v.union(
    v.literal("portrait"),
    v.literal("landscape"),
    v.literal("adaptive"),
  ),
  remoteDisplayMode: v.union(v.literal("shared"), v.literal("per-player")),
  maxViewports: v.number(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  passwordHash: v.optional(v.string()),
  maxPlayers: v.number(),
};
export const updateRoomArgs = {
  code: v.string(),
  name: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  maxPlayers: v.number(),
  passwordMode: v.union(v.literal("keep"), v.literal("set"), v.literal("remove")),
  password: v.optional(v.string()),
};
export const updateRoomInternalArgs = {
  roomId: v.id("rooms"),
  hostUserId: v.id("users"),
  name: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  maxPlayers: v.number(),
  removePassword: v.boolean(),
  passwordHash: v.optional(v.string()),
};
export const joinRoomArgs = { code: v.string(), password: v.optional(v.string()) };
export const joinRoomInternalArgs = { roomId: v.id("rooms"), userId: v.id("users") };
export const roomCodeArgs = { code: v.string() };
export const membershipArgs = { roomId: v.id("rooms"), userId: v.id("users") };
export const touchMembershipArgs = { memberId: v.id("roomMembers") };
