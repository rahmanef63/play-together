import type { TicketClaims } from "@play-together/contracts";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { pinnedReleaseAccess } from "./_shared/gameRelease";
import { requireActionUser } from "./_shared/guards";
import { signTicket } from "./_shared/ticketCrypto";

export const issue = action({
  args: {
    code: v.string(),
    role: v.union(v.literal("controller"), v.literal("display")),
    mode: v.union(v.literal("remote"), v.literal("handheld")),
  },
  handler: async (ctx, args) => {
    const userId = await requireActionUser(ctx);
    const code = args.code.trim().toUpperCase();
    const room = await ctx.runQuery(internal.rooms.getInternal, { code });
    if (room?.status !== "open")
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room not found or closed" });
    const member = await ctx.runQuery(internal.rooms.getMembershipInternal, {
      roomId: room._id,
      userId,
    });
    if (member?.status !== "active")
      throw new ConvexError({ code: "NOT_A_MEMBER", message: "Join the room before connecting" });
    if ((room.playState ?? "lobby") !== "playing") {
      throw new ConvexError({
        code: "GAME_NOT_STARTED",
        message: "The host has not started the game yet",
      });
    }
    const game = await ctx.runQuery(internal.games.getReleaseInternal, {
      gameId: room.gameId,
      version: room.gameVersion,
    });
    if (!game)
      throw new ConvexError({
        code: "PINNED_RELEASE_UNAVAILABLE",
        message: "The pinned game release no longer exists",
      });
    const releaseAccess = pinnedReleaseAccess(game, room.manifestSha256);
    if (releaseAccess === "mismatch")
      throw new ConvexError({
        code: "PINNED_RELEASE_UNAVAILABLE",
        message: "The pinned game release no longer matches this room",
      });
    if (releaseAccess === "blocked")
      throw new ConvexError({
        code: "GAME_BLOCKED",
        message: game.retirementReason ?? "This game release is blocked",
      });
    if (args.role === "display" && args.mode !== "remote") {
      throw new ConvexError({
        code: "INVALID_MODE",
        message: "Display connections use remote mode",
      });
    }
    if (args.role === "controller" && args.mode === "remote" && !game.supportsRemote) {
      throw new ConvexError({
        code: "MODE_UNSUPPORTED",
        message: "This game does not support remote-only controllers",
      });
    }
    if (args.role === "controller" && args.mode === "handheld" && !game.supportsHandheld) {
      throw new ConvexError({
        code: "MODE_UNSUPPORTED",
        message: "This game does not support handheld mode",
      });
    }
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `ticket:${userId}:${room._id}`,
      max: 30,
      windowMs: 60_000,
    });
    await ctx.runMutation(internal.rooms.touchMembershipInternal, { memberId: member._id });
    const secret = process.env.JOIN_TICKET_SECRET;
    if (!secret)
      throw new ConvexError({
        code: "SERVER_MISCONFIGURED",
        message: "Realtime tickets are not configured",
      });
    const now = Math.floor(Date.now() / 1000);
    const claims: TicketClaims = {
      iss: "play-together",
      aud: "play-together-realtime",
      sub: String(userId),
      roomId: String(room._id),
      roomCode: room.code,
      role: args.role,
      mode: args.mode,
      gameId: room.gameId,
      gameVersion: room.gameVersion,
      manifestUrl: room.manifestUrl,
      manifestSha256: room.manifestSha256,
      iat: now,
      exp: now + 10 * 60,
      jti: crypto.randomUUID(),
    };
    return {
      ticket: await signTicket(claims, secret),
      expiresAt: claims.exp * 1000,
      playerId: claims.sub,
      manifestUrl: claims.manifestUrl,
      manifestSha256: claims.manifestSha256,
      gameId: claims.gameId,
      gameVersion: claims.gameVersion,
    };
  },
});
