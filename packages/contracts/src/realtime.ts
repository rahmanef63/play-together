import { z } from "zod";
import { connectionRoleSchema, controllerModeSchema, GAME_PROTOCOL_VERSION } from "./common.js";

export const clientInputMessageSchema = z.object({
  type: z.literal("input"),
  seq: z.number().int().nonnegative(),
  sentAt: z.number().int().nonnegative(),
  payload: z.unknown(),
});
export const runtimeTelemetrySchema = z.object({
  frameP95Ms: z.number().nonnegative().max(5_000),
  frameMaxMs: z.number().nonnegative().max(5_000),
  frameSamples: z.number().int().min(1).max(5_000),
  rttMs: z.number().nonnegative().max(60_000).optional(),
});
export type RuntimeTelemetry = z.infer<typeof runtimeTelemetrySchema>;

export const clientHeartbeatMessageSchema = z.object({
  type: z.literal("heartbeat"),
  sentAt: z.number().int().nonnegative(),
  telemetry: runtimeTelemetrySchema.optional(),
});
export const clientMessageSchema = z.discriminatedUnion("type", [
  clientInputMessageSchema,
  clientHeartbeatMessageSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const serverWelcomeMessageSchema = z.object({
  type: z.literal("welcome"),
  connectionId: z.string(),
  playerId: z.string(),
  roomId: z.string(),
  roomCode: z.string(),
  role: connectionRoleSchema,
  mode: controllerModeSchema,
  gameId: z.string(),
  gameVersion: z.string(),
  protocolVersion: z.literal(GAME_PROTOCOL_VERSION),
});
export const serverSnapshotMessageSchema = z.object({
  type: z.literal("snapshot"),
  tick: z.number().int().nonnegative(),
  serverTime: z.number().int().nonnegative(),
  state: z.unknown(),
});
export type SnapshotMessage = z.infer<typeof serverSnapshotMessageSchema>;
export const serverPresenceMessageSchema = z.object({
  type: z.literal("presence"),
  players: z.array(
    z.object({
      playerId: z.string(),
      role: connectionRoleSchema,
      mode: controllerModeSchema,
      connectedAt: z.number().int().nonnegative(),
    }),
  ),
});
export const serverErrorMessageSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
  fatal: z.boolean(),
});
export const serverPongMessageSchema = z.object({
  type: z.literal("pong"),
  sentAt: z.number().int().nonnegative(),
  serverTime: z.number().int().nonnegative(),
});
export const serverMessageSchema = z.discriminatedUnion("type", [
  serverWelcomeMessageSchema,
  serverSnapshotMessageSchema,
  serverPresenceMessageSchema,
  serverErrorMessageSchema,
  serverPongMessageSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;
