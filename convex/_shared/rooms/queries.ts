import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { requireQueryUser } from "../guards";
import { PRESENCE_TTL_MS } from "./types";

async function activePlayerCount(
  ctx: QueryCtx,
  roomId: Id<"rooms">,
  cutoff: number,
): Promise<number> {
  const members = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  return members.filter((member) => member.status === "active" && member.lastSeenAt >= cutoff)
    .length;
}
export async function listPublicRooms(ctx: QueryCtx) {
  await requireQueryUser(ctx);
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_visibility_status", (q) => q.eq("visibility", "public").eq("status", "open"))
    .take(100);
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  const summaries = await Promise.all(
    rooms.map(async (room) => {
      const activePlayers = await activePlayerCount(ctx, room._id, cutoff);
      return {
        code: room.code,
        name: room.name,
        gameId: room.gameId,
        gameVersion: room.gameVersion,
        gameTitle: room.gameTitle,
        hostName: room.hostName,
        maxPlayers: room.maxPlayers,
        activePlayers,
        availableSpots: Math.max(0, room.maxPlayers - activePlayers),
        requiresPassword: Boolean(room.passwordHash),
        createdAt: room.createdAt,
      };
    }),
  );
  return summaries
    .filter((room) => room.availableSpots > 0)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export async function listHostedRooms(ctx: QueryCtx) {
  const userId = await requireQueryUser(ctx);
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_host", (q) => q.eq("hostUserId", userId))
    .take(100);
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  const summaries = await Promise.all(
    rooms.map(async (room) => {
      const activePlayers = await activePlayerCount(ctx, room._id, cutoff);
      return {
        code: room.code,
        name: room.name,
        gameId: room.gameId,
        gameVersion: room.gameVersion,
        gameTitle: room.gameTitle,
        hostName: room.hostName,
        maxPlayers: room.maxPlayers,
        activePlayers,
        availableSpots: Math.max(0, room.maxPlayers - activePlayers),
        requiresPassword: Boolean(room.passwordHash),
        visibility: room.visibility,
        status: room.status,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    }),
  );
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function getRoomByCode(ctx: QueryCtx, args: { code: string }) {
  await requireQueryUser(ctx);
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
    .unique();
  if (!room) return null;
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  const members = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", room._id))
    .collect();
  const activeMembers = members
    .filter((member) => member.status === "active" && member.lastSeenAt >= cutoff)
    .map((member) => ({ userId: member.userId, displayName: member.displayName }));
  return {
    code: room.code,
    name: room.name,
    hostUserId: room.hostUserId,
    hostName: room.hostName,
    gameId: room.gameId,
    gameVersion: room.gameVersion,
    gameTitle: room.gameTitle,
    gameModes: room.gameModes ?? ["shared-screen", "handheld"],
    supportsRemote: room.supportsRemote ?? true,
    supportsHandheld: room.supportsHandheld ?? true,
    preferredOrientation: room.preferredOrientation ?? "adaptive",
    visibility: room.visibility,
    requiresPassword: Boolean(room.passwordHash),
    maxPlayers: room.maxPlayers,
    status: room.status,
    playState: room.playState ?? "lobby",
    sessionStartedAt: room.sessionStartedAt,
    activeMembers,
  };
}
export async function getRoomInternal(ctx: QueryCtx, args: { code: string }) {
  return ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", args.code))
    .unique();
}
export async function getMembershipInternal(
  ctx: QueryCtx,
  args: { roomId: Id<"rooms">; userId: Id<"users"> },
) {
  return ctx.db
    .query("roomMembers")
    .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", args.userId))
    .unique();
}
