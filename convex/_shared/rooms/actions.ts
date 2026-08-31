import type { FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { requireActionUser } from "../guards";
import { hashSecret, verifySecret } from "../passwordCrypto";
import type {
  CreateRoomArgs,
  CreateRoomInternalArgs,
  JoinInternalResult,
  JoinRoomResult,
  RoomActionResult,
  UpdateRoomArgs,
  UpdateRoomInternalArgs,
} from "./types";
import { cleanRoomName, randomRoomCode, validateRoomPassword } from "./validation";

const createInternalRef = internal.rooms.createInternal as unknown as FunctionReference<
  "mutation",
  "internal",
  CreateRoomInternalArgs & Record<string, unknown>,
  RoomActionResult | null
>;
const updateInternalRef = internal.rooms.updateInternal as unknown as FunctionReference<
  "mutation",
  "internal",
  UpdateRoomInternalArgs & Record<string, unknown>,
  boolean
>;
const joinInternalRef = internal.rooms.joinInternal as unknown as FunctionReference<
  "mutation",
  "internal",
  { roomId: Id<"rooms">; userId: Id<"users"> } & Record<string, unknown>,
  JoinInternalResult
>;

export async function createRoom(ctx: ActionCtx, args: CreateRoomArgs): Promise<RoomActionResult> {
  const userId = await requireActionUser(ctx);
  await ctx.runMutation(internal.security.consumeRateLimit, {
    key: `room:create:${userId}`,
    max: 5,
    windowMs: 60_000,
  });
  const name = cleanRoomName(args.name);
  const game: Doc<"games"> | null = await ctx.runQuery(internal.games.getPublishedInternal, {
    gameId: args.gameId,
    version: args.gameVersion,
  });
  if (!game)
    throw new ConvexError({ code: "GAME_NOT_FOUND", message: "That game version is unavailable" });
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
  const password = validateRoomPassword(args.password);
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
    const result: RoomActionResult | null = await ctx.runMutation(createInternalRef, {
      ...base,
      ...(passwordHash ? { passwordHash } : {}),
    });
    if (result) return result;
  }
  throw new ConvexError({ code: "ROOM_CODE_EXHAUSTED", message: "Could not allocate a room code" });
}

export async function updateRoom(ctx: ActionCtx, args: UpdateRoomArgs): Promise<RoomActionResult> {
  const userId = await requireActionUser(ctx);
  await ctx.runMutation(internal.security.consumeRateLimit, {
    key: `room:update:${userId}`,
    max: 20,
    windowMs: 60_000,
  });
  const code = args.code.trim().toUpperCase();
  const room: Doc<"rooms"> | null = await ctx.runQuery(internal.rooms.getInternal, { code });
  if (!room || room.hostUserId !== userId)
    throw new ConvexError({ code: "FORBIDDEN", message: "Only the host can edit this room" });
  const name = cleanRoomName(args.name);
  const password = args.passwordMode === "set" ? validateRoomPassword(args.password) : undefined;
  if (args.passwordMode === "set" && !password)
    throw new ConvexError({
      code: "INVALID_ROOM_PASSWORD",
      message: "Room password must be 4–64 characters",
    });
  const passwordHash = password ? await hashSecret(password) : undefined;
  await ctx.runMutation(updateInternalRef, {
    roomId: room._id,
    hostUserId: userId,
    name,
    visibility: args.visibility,
    maxPlayers: args.maxPlayers,
    removePassword: args.passwordMode === "remove",
    ...(passwordHash ? { passwordHash } : {}),
  });
  return { code: room.code, roomId: room._id };
}

export async function joinRoom(
  ctx: ActionCtx,
  args: { code: string; password?: string },
): Promise<JoinRoomResult> {
  const userId = await requireActionUser(ctx);
  const code = args.code.trim().toUpperCase();
  const room: Doc<"rooms"> | null = await ctx.runQuery(internal.rooms.getInternal, { code });
  if (room?.status !== "open")
    return { ok: false, error: "ROOM_NOT_FOUND", message: "Room not found or closed" };
  await ctx.runMutation(internal.security.consumeRateLimit, {
    key: `room:join:${userId}:${room._id}`,
    max: 10,
    windowMs: 10 * 60_000,
  });
  if (
    room.passwordHash &&
    !(args.password ? await verifySecret(args.password, room.passwordHash) : false)
  ) {
    return { ok: false, error: "WRONG_PASSWORD", message: "Room password is incorrect" };
  }
  return (await ctx.runMutation(joinInternalRef, {
    roomId: room._id,
    userId,
  })) as JoinInternalResult;
}
