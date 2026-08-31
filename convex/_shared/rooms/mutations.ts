import { ConvexError } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { roomAdmissionFailure } from "../roomAdmission";
import { type CreateRoomInternalArgs, PRESENCE_TTL_MS, type UpdateRoomInternalArgs } from "./types";

export async function createRoomInternal(ctx: MutationCtx, args: CreateRoomInternalArgs) {
  const collision = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", args.code))
    .unique();
  if (collision) return null;
  const user = await ctx.db.get("users", args.hostUserId);
  if (!user)
    throw new ConvexError({ code: "USER_NOT_FOUND", message: "Host account no longer exists" });
  const now = Date.now();
  const roomId = await ctx.db.insert("rooms", {
    ...args,
    hostName: user.name ?? "Player",
    status: "open",
    playState: "lobby",
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("roomMembers", {
    roomId,
    userId: args.hostUserId,
    displayName: user.name ?? "Player",
    status: "active",
    joinedAt: now,
    lastSeenAt: now,
  });
  return { code: args.code, roomId };
}
export async function updateRoomInternal(ctx: MutationCtx, args: UpdateRoomInternalArgs) {
  const room = await ctx.db.get("rooms", args.roomId);
  if (!room || room.hostUserId !== args.hostUserId)
    throw new ConvexError({ code: "FORBIDDEN", message: "Only the host can edit this room" });
  if (room.status !== "open")
    throw new ConvexError({ code: "ROOM_CLOSED", message: "Closed rooms cannot be edited" });
  const game = await ctx.db
    .query("games")
    .withIndex("by_game_version", (q) =>
      q.eq("gameId", room.gameId).eq("version", room.gameVersion),
    )
    .unique();
  if (
    !game ||
    !Number.isInteger(args.maxPlayers) ||
    args.maxPlayers < game.minPlayers ||
    args.maxPlayers > game.maxPlayers
  ) {
    throw new ConvexError({
      code: "INVALID_CAPACITY",
      message: game
        ? `Capacity must be ${game.minPlayers}–${game.maxPlayers}`
        : "Pinned game version is unavailable",
    });
  }
  const members = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", room._id))
    .collect();
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  const activePlayers = members.filter(
    (member) => member.status === "active" && member.lastSeenAt >= cutoff,
  ).length;
  if (activePlayers > args.maxPlayers)
    throw new ConvexError({
      code: "ROOM_OCCUPIED",
      message: `Capacity cannot be lower than ${activePlayers} active players`,
    });
  const patch = {
    name: args.name,
    visibility: args.visibility,
    maxPlayers: args.maxPlayers,
    updatedAt: Date.now(),
  };
  if (args.removePassword) await ctx.db.patch(room._id, { ...patch, passwordHash: undefined });
  else if (args.passwordHash)
    await ctx.db.patch(room._id, { ...patch, passwordHash: args.passwordHash });
  else await ctx.db.patch(room._id, patch);
  return true;
}
export async function joinRoomInternal(
  ctx: MutationCtx,
  args: { roomId: Id<"rooms">; userId: Id<"users"> },
) {
  const room = await ctx.db.get("rooms", args.roomId);
  const user = await ctx.db.get("users", args.userId);
  if (room?.status !== "open") return roomAdmissionFailure("ROOM_CLOSED");
  if (!user) return roomAdmissionFailure("USER_NOT_FOUND");
  const now = Date.now();
  const cutoff = now - PRESENCE_TTL_MS;
  const members = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", room._id))
    .collect();
  const existing = members.find((member) => member.userId === args.userId);
  const activePlayers = members.filter(
    (member) =>
      member.status === "active" && member.lastSeenAt >= cutoff && member.userId !== args.userId,
  ).length;
  if (activePlayers >= room.maxPlayers) return roomAdmissionFailure("ROOM_FULL");
  if (existing)
    await ctx.db.patch(existing._id, {
      status: "active",
      lastSeenAt: now,
      displayName: user.name ?? "Player",
    });
  else
    await ctx.db.insert("roomMembers", {
      roomId: room._id,
      userId: args.userId,
      displayName: user.name ?? "Player",
      status: "active",
      joinedAt: now,
      lastSeenAt: now,
    });
  return { ok: true as const, code: room.code, roomId: room._id };
}
