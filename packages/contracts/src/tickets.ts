import { z } from "zod";
import { connectionRoleSchema, controllerModeSchema } from "./common.js";

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

export const templateDownloadClaimsSchema = z.object({
  iss: z.literal("play-together"),
  aud: z.literal("play-together-template-download"),
  sub: z.string().min(1),
  templateId: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  blobPath: z.string().min(1).max(512),
  fileName: z.string().min(1).max(160),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  jti: z.string().min(8),
});
export type TemplateDownloadClaims = z.infer<typeof templateDownloadClaimsSchema>;
