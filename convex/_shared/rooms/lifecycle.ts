import { ConvexError } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireMutationUser } from "../guards";

async function hostRoom(ctx: MutationCtx, code: string, userId: Id<"users">, message: string) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
    .unique();
  if (!room || room.hostUserId !== userId) throw new ConvexError({ code: "FORBIDDEN", message });
  return room;
}
export async function startGame(ctx: MutationCtx, args: { code: string }) {
  const userId = await requireMutationUser(ctx);
  const room = await hostRoom(ctx, args.code, userId, "Only the host can start this game");
  if (room.status !== "open")
    throw new ConvexError({ code: "ROOM_CLOSED", message: "Closed rooms cannot start a game" });
  if ((room.playState ?? "lobby") === "playing") return true;
  const now = Date.now();
  await ctx.db.patch(room._id, { playState: "playing", sessionStartedAt: now, updatedAt: now });
  return true;
}
export async function returnToLobby(ctx: MutationCtx, args: { code: string }) {
  const userId = await requireMutationUser(ctx);
  const room = await hostRoom(ctx, args.code, userId, "Only the host can return to the menu");
  if (room.status !== "open")
    throw new ConvexError({
      code: "ROOM_CLOSED",
      message: "Closed rooms cannot return to the menu",
    });
  await ctx.db.patch(room._id, {
    playState: "lobby",
    sessionStartedAt: undefined,
    updatedAt: Date.now(),
  });
  return true;
}
export async function heartbeat(ctx: MutationCtx, args: { code: string }) {
  const userId = await requireMutationUser(ctx);
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
    .unique();
  if (!room) return false;
  const member = await ctx.db
    .query("roomMembers")
    .withIndex("by_room_user", (q) => q.eq("roomId", room._id).eq("userId", userId))
    .unique();
  if (member?.status !== "active") return false;
  await ctx.db.patch(member._id, { lastSeenAt: Date.now() });
  return true;
}
export async function leaveRoom(ctx: MutationCtx, args: { code: string }) {
  const userId = await requireMutationUser(ctx);
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
    .unique();
  if (!room) return false;
  const member = await ctx.db
    .query("roomMembers")
    .withIndex("by_room_user", (q) => q.eq("roomId", room._id).eq("userId", userId))
    .unique();
  if (!member) return false;
  await ctx.db.patch(member._id, { status: "left", lastSeenAt: Date.now() });
  return true;
}
export async function closeRoom(ctx: MutationCtx, args: { code: string }) {
  const userId = await requireMutationUser(ctx);
  const room = await hostRoom(ctx, args.code, userId, "Only the host can close this room");
  await ctx.db.patch(room._id, { status: "closed", updatedAt: Date.now() });
  return true;
}
export async function removeRoom(ctx: MutationCtx, args: { code: string }) {
  const userId = await requireMutationUser(ctx);
  const room = await hostRoom(ctx, args.code, userId, "Only the host can delete this room");
  const members = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", room._id))
    .collect();
  for (const member of members) await ctx.db.delete(member._id);
  await ctx.db.delete(room._id);
  return true;
}
export async function touchMembership(ctx: MutationCtx, args: { memberId: Id<"roomMembers"> }) {
  return ctx.db.patch(args.memberId, { status: "active", lastSeenAt: Date.now() });
}
