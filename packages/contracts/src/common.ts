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
