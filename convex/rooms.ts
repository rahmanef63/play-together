import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { createRoom, joinRoom, updateRoom } from "./_shared/rooms/actions";
import {
  closeRoom,
  heartbeat as heartbeatHandler,
  leaveRoom,
  removeRoom,
  returnToLobby as returnToLobbyHandler,
  startGame as startGameHandler,
  touchMembership,
} from "./_shared/rooms/lifecycle";
import {
  createRoomInternal,
  joinRoomInternal,
  updateRoomInternal,
} from "./_shared/rooms/mutations";
import {
  getRoomByCode,
  listHostedRooms,
  listPublicRooms,
  getMembershipInternal as readMembershipInternal,
  getRoomInternal as readRoomInternal,
} from "./_shared/rooms/queries";
import {
  createRoomArgs,
  createRoomInternalArgs,
  joinRoomArgs,
  joinRoomInternalArgs,
  membershipArgs,
  roomCodeArgs,
  touchMembershipArgs,
  updateRoomArgs,
  updateRoomInternalArgs,
} from "./_shared/rooms/validators";

export const create = action({
  args: createRoomArgs,
  handler: (ctx, args) => createRoom(ctx, args),
});
export const createInternal = internalMutation({
  args: createRoomInternalArgs,
  handler: (ctx, args) => createRoomInternal(ctx, args),
});
export const update = action({
  args: updateRoomArgs,
  handler: (ctx, args) => updateRoom(ctx, args),
});
export const updateInternal = internalMutation({
  args: updateRoomInternalArgs,
  handler: (ctx, args) => updateRoomInternal(ctx, args),
});
export const join = action({ args: joinRoomArgs, handler: (ctx, args) => joinRoom(ctx, args) });
export const joinInternal = internalMutation({
  args: joinRoomInternalArgs,
  handler: (ctx, args) => joinRoomInternal(ctx, args),
});
export const listPublic = query({ args: {}, handler: (ctx) => listPublicRooms(ctx) });
export const listMine = query({ args: {}, handler: (ctx) => listHostedRooms(ctx) });
export const getByCode = query({
  args: roomCodeArgs,
  handler: (ctx, args) => getRoomByCode(ctx, args),
});
export const startGame = mutation({
  args: roomCodeArgs,
  handler: (ctx, args) => startGameHandler(ctx, args),
});
export const returnToLobby = mutation({
  args: roomCodeArgs,
  handler: (ctx, args) => returnToLobbyHandler(ctx, args),
});
export const heartbeat = mutation({
  args: roomCodeArgs,
  handler: (ctx, args) => heartbeatHandler(ctx, args),
});
export const leave = mutation({ args: roomCodeArgs, handler: (ctx, args) => leaveRoom(ctx, args) });
export const close = mutation({ args: roomCodeArgs, handler: (ctx, args) => closeRoom(ctx, args) });
export const remove = mutation({
  args: roomCodeArgs,
  handler: (ctx, args) => removeRoom(ctx, args),
});
export const getInternal = internalQuery({
  args: roomCodeArgs,
  handler: (ctx, args) => readRoomInternal(ctx, args),
});
export const getMembershipInternal = internalQuery({
  args: membershipArgs,
  handler: (ctx, args) => readMembershipInternal(ctx, args),
});
export const touchMembershipInternal = internalMutation({
  args: touchMembershipArgs,
  handler: (ctx, args) => touchMembership(ctx, args),
});
