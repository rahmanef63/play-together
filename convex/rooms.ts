import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireActionUser, requireMutationUser, requireQueryUser } from "./_shared/guards";
import { hashSecret, verifySecret } from "./_shared/passwordCrypto";
import { type RoomAdmissionFailure, roomAdmissionFailure } from "./_shared/roomAdmission";

const PRESENCE_TTL_MS = 45_000;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface RoomActionResult {
  code: string;
  roomId: Id<"rooms">;
}

interface JoinRoomSuccess extends RoomActionResult {
  ok: true;
}

interface JoinRoomFailure {
  ok: false;
  error: "ROOM_NOT_FOUND" | "WRONG_PASSWORD" | RoomAdmissionFailure["error"];
  message: string;
}

type JoinRoomResult = JoinRoomSuccess | JoinRoomFailure;
type JoinInternalResult = JoinRoomSuccess | RoomAdmissionFailure;

interface CreateRoomInternalArgs {
  code: string;
  name: string;
  hostUserId: Id<"users">;
  gameId: string;
  gameVersion: string;
  gameTitle: string;
  manifestUrl: string;
  manifestSha256: string;
  gameModes: Array<"shared-screen" | "handheld">;
  supportsRemote: boolean;
  supportsHandheld: boolean;
  preferredOrientation: "portrait" | "landscape" | "adaptive";
  visibility: "public" | "private";
  maxPlayers: number;
}

function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join("");
}

function cleanName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 64) {
    throw new ConvexError({
      code: "INVALID_ROOM_NAME",
      message: "Room name must be 2–64 characters",
    });
  }
  return name;
}

export const create = action({
  args: {
    name: v.string(),
    gameId: v.string(),
    gameVersion: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    password: v.optional(v.string()),
    maxPlayers: v.number(),
  },
  handler: async (ctx, args): Promise<RoomActionResult> => {
    const userId = await requireActionUser(ctx);
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `room:create:${userId}`,
      max: 5,
      windowMs: 60_000,
    });
    const name = cleanName(args.name);
    const game: Doc<"games"> | null = await ctx.runQuery(internal.games.getPublishedInternal, {
      gameId: args.gameId,
      version: args.gameVersion,
    });
    if (!game)
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "That game version is unavailable",
      });
    if (
      !Number.isInteger(args.maxPlayers) ||
      args.maxPlayers < game.minPlayers ||
      args.maxPlayers > game.maxPlayers
    ) {
      throw new ConvexError({
        code: "INVALID_CAPACITY",
        message: `Capacity must be ${game.minPlayers}–${game.maxPlayers}`,
      });
    }
    const password = args.password?.trim() || undefined;
    if (password && (password.length < 4 || password.length > 64)) {
      throw new ConvexError({
        code: "INVALID_ROOM_PASSWORD",
        message: "Room password must be 4–64 characters",
      });
    }
    const passwordHash = password ? await hashSecret(password) : undefined;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const base: CreateRoomInternalArgs = {
        code: randomRoomCode(),
        name,
        hostUserId: userId,
        gameId: game.gameId,
        gameVersion: game.version,
        gameTitle: game.title,
        manifestUrl: game.manifestUrl,
        manifestSha256: game.manifestSha256,
        gameModes: game.modes,
        supportsRemote: game.supportsRemote,
        supportsHandheld: game.supportsHandheld,
        preferredOrientation: game.preferredOrientation ?? "adaptive",
        visibility: args.visibility,
        maxPlayers: args.maxPlayers,
      };
      const result: RoomActionResult | null = await ctx.runMutation(
        internal.rooms.createInternal,
        passwordHash ? { ...base, passwordHash } : base,
      );
      if (result) return result;
    }
    throw new ConvexError({
      code: "ROOM_CODE_EXHAUSTED",
      message: "Could not allocate a room code",
    });
  },
});

export const createInternal = internalMutation({
  args: {
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
    visibility: v.union(v.literal("public"), v.literal("private")),
    passwordHash: v.optional(v.string()),
    maxPlayers: v.number(),
  },
  handler: async (ctx, args) => {
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
  },
});

export const update = action({
  args: {
    code: v.string(),
    name: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    maxPlayers: v.number(),
    passwordMode: v.union(v.literal("keep"), v.literal("set"), v.literal("remove")),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RoomActionResult> => {
    const userId = await requireActionUser(ctx);
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `room:update:${userId}`,
      max: 20,
      windowMs: 60_000,
    });
    const code = args.code.trim().toUpperCase();
    const room: Doc<"rooms"> | null = await ctx.runQuery(internal.rooms.getInternal, { code });
    if (!room || room.hostUserId !== userId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only the host can edit this room" });
    }
    const name = cleanName(args.name);
    let passwordHash: string | undefined;
    if (args.passwordMode === "set") {
      const password = args.password?.trim() ?? "";
      if (password.length < 4 || password.length > 64) {
        throw new ConvexError({
          code: "INVALID_ROOM_PASSWORD",
          message: "Room password must be 4–64 characters",
        });
      }
      passwordHash = await hashSecret(password);
    }
    await ctx.runMutation(internal.rooms.updateInternal, {
      roomId: room._id,
      hostUserId: userId,
      name,
      visibility: args.visibility,
      maxPlayers: args.maxPlayers,
      removePassword: args.passwordMode === "remove",
      ...(passwordHash ? { passwordHash } : {}),
    });
    return { code: room.code, roomId: room._id };
  },
});

export const updateInternal = internalMutation({
  args: {
    roomId: v.id("rooms"),
    hostUserId: v.id("users"),
    name: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    maxPlayers: v.number(),
    removePassword: v.boolean(),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room || room.hostUserId !== args.hostUserId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only the host can edit this room" });
    }
    if (room.status !== "open") {
      throw new ConvexError({ code: "ROOM_CLOSED", message: "Closed rooms cannot be edited" });
    }
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
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    const members = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const activePlayers = members.filter(
      (member) => member.status === "active" && member.lastSeenAt >= cutoff,
    ).length;
    if (activePlayers > args.maxPlayers) {
      throw new ConvexError({
        code: "ROOM_OCCUPIED",
        message: `Capacity cannot be lower than ${activePlayers} active players`,
      });
    }
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
  },
});

export const join = action({
  args: { code: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args): Promise<JoinRoomResult> => {
    const userId = await requireActionUser(ctx);
    const code = args.code.trim().toUpperCase();
    const room: Doc<"rooms"> | null = await ctx.runQuery(internal.rooms.getInternal, { code });
    if (room?.status !== "open") {
      return {
        ok: false,
        error: "ROOM_NOT_FOUND",
        message: "Room not found or closed",
      };
    }
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `room:join:${userId}:${room._id}`,
      max: 10,
      windowMs: 10 * 60_000,
    });
    if (room.passwordHash) {
      const valid = args.password ? await verifySecret(args.password, room.passwordHash) : false;
      if (!valid) {
        return {
          ok: false,
          error: "WRONG_PASSWORD",
          message: "Room password is incorrect",
        };
      }
    }
    const joined: JoinInternalResult = await ctx.runMutation(internal.rooms.joinInternal, {
      roomId: room._id,
      userId,
    });
    return joined;
  },
});

export const joinInternal = internalMutation({
  args: { roomId: v.id("rooms"), userId: v.id("users") },
  handler: async (ctx, args) => {
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
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        lastSeenAt: now,
        displayName: user.name ?? "Player",
      });
    } else {
      await ctx.db.insert("roomMembers", {
        roomId: room._id,
        userId: args.userId,
        displayName: user.name ?? "Player",
        status: "active",
        joinedAt: now,
        lastSeenAt: now,
      });
    }
    return { ok: true as const, code: room.code, roomId: room._id };
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    await requireQueryUser(ctx);
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_visibility_status", (q) => q.eq("visibility", "public").eq("status", "open"))
      .take(100);
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    const summaries = await Promise.all(
      rooms.map(async (room) => {
        const members = await ctx.db
          .query("roomMembers")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        const activePlayers = members.filter(
          (member) => member.status === "active" && member.lastSeenAt >= cutoff,
        ).length;
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
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireQueryUser(ctx);
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_host", (q) => q.eq("hostUserId", userId))
      .take(100);
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    const summaries = await Promise.all(
      rooms.map(async (room) => {
        const members = await ctx.db
          .query("roomMembers")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        const activePlayers = members.filter(
          (member) => member.status === "active" && member.lastSeenAt >= cutoff,
        ).length;
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
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
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
      activeMembers,
    };
  },
});

export const heartbeat = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
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
  },
});

export const leave = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
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
  },
});

export const close = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireMutationUser(ctx);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!room || room.hostUserId !== userId)
      throw new ConvexError({ code: "FORBIDDEN", message: "Only the host can close this room" });
    await ctx.db.patch(room._id, { status: "closed", updatedAt: Date.now() });
    return true;
  },
});

export const remove = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireMutationUser(ctx);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!room || room.hostUserId !== userId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only the host can delete this room" });
    }
    const members = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    for (const member of members) await ctx.db.delete(member._id);
    await ctx.db.delete(room._id);
    return true;
  },
});

export const getInternal = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique(),
});

export const getMembershipInternal = internalQuery({
  args: { roomId: v.id("rooms"), userId: v.id("users") },
  handler: async (ctx, args) =>
    ctx.db
      .query("roomMembers")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", args.userId))
      .unique(),
});

export const touchMembershipInternal = internalMutation({
  args: { memberId: v.id("roomMembers") },
  handler: async (ctx, args) =>
    ctx.db.patch(args.memberId, { status: "active", lastSeenAt: Date.now() }),
});
