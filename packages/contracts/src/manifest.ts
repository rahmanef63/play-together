import { z } from "zod";
import { GAME_MANIFEST_SCHEMA_VERSION, GAME_PROTOCOL_VERSION, gameModeSchema } from "./common.js";
import { builtinConsoleSchema, consoleShellPresetSchema } from "./console.js";

export const moduleEntrySchema = z.object({
  url: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type ModuleEntry = z.infer<typeof moduleEntrySchema>;

export const assetEntrySchema = z.object({
  url: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  contentType: z.string().min(1).max(120),
  bytes: z.number().int().positive(),
});
export type AssetEntry = z.infer<typeof assetEntrySchema>;

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
  runtimeDependencies: z
    .record(
      z.string().regex(/^[a-z0-9@][a-z0-9@/._-]{0,79}$/),
      z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
    )
    .optional(),
  controller: z.object({
    supportsRemote: z.boolean(),
    supportsHandheld: z.boolean(),
    preferredOrientation: z.enum(["portrait", "landscape", "adaptive"]),
    shellPreset: consoleShellPresetSchema.optional(),
    console: builtinConsoleSchema.optional(),
  }),
  entries: z.object({
    display: moduleEntrySchema,
    controller: moduleEntrySchema.optional(),
    server: moduleEntrySchema,
  }),
  assets: z.record(z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/), assetEntrySchema).optional(),
  capabilities: z.object({
    touch: z.boolean(),
    keyboard: z.boolean(),
    gamepad: z.boolean(),
    motion: z.boolean(),
  }),
});
export type GameManifest = z.infer<typeof gameManifestSchema>;
