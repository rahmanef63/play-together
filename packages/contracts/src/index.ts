import { z } from "zod";

export const GAME_PROTOCOL_VERSION = 1 as const;
export const GAME_MANIFEST_SCHEMA_VERSION = 1 as const;

export const roomVisibilitySchema = z.enum(["public", "private"]);
export type RoomVisibility = z.infer<typeof roomVisibilitySchema>;

export const connectionRoleSchema = z.enum(["controller", "display"]);
export type ConnectionRole = z.infer<typeof connectionRoleSchema>;

export const controllerModeSchema = z.enum(["remote", "handheld"]);
export type ControllerMode = z.infer<typeof controllerModeSchema>;

export const gameModeSchema = z.enum(["shared-screen", "handheld"]);
export type GameMode = z.infer<typeof gameModeSchema>;

export const consoleShellPresetSchema = z.enum(["classic", "racing", "flight"]);
export type ConsoleShellPreset = z.infer<typeof consoleShellPresetSchema>;

export const moduleEntrySchema = z.object({
  url: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type ModuleEntry = z.infer<typeof moduleEntrySchema>;

export const gameManifestSchema = z.object({
  schemaVersion: z.literal(GAME_MANIFEST_SCHEMA_VERSION),
  protocolVersion: z.literal(GAME_PROTOCOL_VERSION),
  game: z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
    version: z.string().min(1).max(64),
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(500),
    minPlayers: z.number().int().min(1).max(32),
    maxPlayers: z.number().int().min(1).max(32),
    tickRate: z.number().int().min(10).max(120),
    snapshotRate: z.number().int().min(1).max(60),
  }),
  modes: z.array(gameModeSchema).min(1),
  controller: z.object({
    supportsRemote: z.boolean(),
    supportsHandheld: z.boolean(),
    preferredOrientation: z.enum(["portrait", "landscape", "adaptive"]),
    shellPreset: consoleShellPresetSchema.optional(),
  }),
  entries: z.object({
    display: moduleEntrySchema,
    controller: moduleEntrySchema,
    server: moduleEntrySchema,
  }),
  capabilities: z.object({
    touch: z.boolean(),
    keyboard: z.boolean(),
    gamepad: z.boolean(),
    motion: z.boolean(),
  }),
});
export type GameManifest = z.infer<typeof gameManifestSchema>;

export const ticketClaimsSchema = z.object({
  iss: z.literal("play-together"),
  aud: z.literal("play-together-realtime"),
  sub: z.string().min(1),
  roomId: z.string().min(1),
  roomCode: z.string().min(4).max(12),
  role: connectionRoleSchema,
  mode: controllerModeSchema,
  gameId: z.string().min(1),
  gameVersion: z.string().min(1),
  manifestUrl: z.string().url(),
  manifestSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  jti: z.string().min(8),
});
export type TicketClaims = z.infer<typeof ticketClaimsSchema>;

export const clientInputMessageSchema = z.object({
  type: z.literal("input"),
  seq: z.number().int().nonnegative(),
  sentAt: z.number().int().nonnegative(),
  payload: z.unknown(),
});

export const clientHeartbeatMessageSchema = z.object({
  type: z.literal("heartbeat"),
  sentAt: z.number().int().nonnegative(),
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

export interface PublicGameSummary {
  gameId: string;
  version: string;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  modes: GameMode[];
  supportsRemote: boolean;
  supportsHandheld: boolean;
  preferredOrientation: "portrait" | "landscape" | "adaptive";
  manifestUrl: string;
  manifestSha256: string;
}

export interface PublicRoomSummary {
  code: string;
  name: string;
  gameId: string;
  gameVersion: string;
  gameTitle: string;
  hostName: string;
  maxPlayers: number;
  activePlayers: number;
  availableSpots: number;
  requiresPassword: boolean;
  createdAt: number;
}
