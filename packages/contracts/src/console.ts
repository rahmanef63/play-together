import { z } from "zod";

export const consoleShellPresetSchema = z.enum(["classic", "racing", "flight"]);
export type ConsoleShellPreset = z.infer<typeof consoleShellPresetSchema>;

export const consoleLayoutSchema = z.enum(["gamepad", "racing", "flight", "arcade", "touch"]);
export type ConsoleLayout = z.infer<typeof consoleLayoutSchema>;

export const consoleZoneSchema = z.enum([
  "left",
  "center",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom",
  "bottom-right",
]);
export type ConsoleZone = z.infer<typeof consoleZoneSchema>;

export const consoleActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("send"), payload: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("patch"), values: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("toggle"), field: z.string().min(1).max(64) }),
  z.object({
    type: z.literal("increment"),
    field: z.string().min(1).max(64),
    delta: z.number().finite(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  }),
  z.object({
    type: z.literal("pulse"),
    values: z.record(z.string(), z.unknown()),
    releaseValues: z.record(z.string(), z.unknown()),
    durationMs: z.number().int().min(16).max(2_000),
  }),
]);
export type ConsoleAction = z.infer<typeof consoleActionSchema>;

const consoleDirectionSchema = z.object({
  press: consoleActionSchema,
  release: consoleActionSchema.optional(),
  keys: z.array(z.string().min(1).max(40)).max(8).optional(),
});

const controlId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/);
const ariaLabel = z.string().min(1).max(80);
const controlKeys = z.array(z.string().min(1).max(40)).max(8).optional();

const consoleButtonControlSchema = z.object({
  id: controlId,
  kind: z.literal("button"),
  label: z.string().min(1).max(16),
  displayLabel: z.string().min(1).max(16).optional(),
  ariaLabel,
  face: z.enum(["a", "b", "x", "y", "start", "select", "l1", "r1", "l2", "r2"]).optional(),
  zone: consoleZoneSchema,
  press: consoleActionSchema,
  release: consoleActionSchema.optional(),
  keys: controlKeys,
});

const consoleDpadControlSchema = z.object({
  id: controlId,
  kind: z.literal("dpad"),
  ariaLabel,
  zone: consoleZoneSchema,
  directions: z.object({
    up: consoleDirectionSchema.optional(),
    down: consoleDirectionSchema.optional(),
    left: consoleDirectionSchema.optional(),
    right: consoleDirectionSchema.optional(),
  }),
});

const consoleStickControlSchema = z.object({
  id: controlId,
  kind: z.literal("stick"),
  ariaLabel,
  zone: consoleZoneSchema,
  action: consoleActionSchema,
  release: consoleActionSchema.optional(),
  keys: z
    .object({ up: controlKeys, down: controlKeys, left: controlKeys, right: controlKeys })
    .optional(),
});

const consoleTouchControlSchema = z.object({
  id: controlId,
  kind: z.literal("touchpad"),
  ariaLabel,
  zone: consoleZoneSchema,
  action: consoleActionSchema,
});

export const consoleControlSchema = z.discriminatedUnion("kind", [
  consoleButtonControlSchema,
  consoleDpadControlSchema,
  consoleStickControlSchema,
  consoleTouchControlSchema,
]);
export type ConsoleControl = z.infer<typeof consoleControlSchema>;

export const builtinConsoleSchema = z.object({
  renderer: z.literal("builtin"),
  layout: consoleLayoutSchema,
  initialState: z.record(z.string(), z.unknown()).optional(),
  controls: z.array(consoleControlSchema).min(1).max(20),
});
export type BuiltinConsoleConfig = z.infer<typeof builtinConsoleSchema>;
