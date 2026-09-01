import { z } from "zod";

export const RELEASE_CONTROL_CHANNEL = "pt:v1:release-control";
export const BLOCKED_RELEASES_KEY = "pt:v1:blocked-releases";

export const releasePolicyStatusSchema = z.enum(["active", "retired", "blocked"]);
export type ReleasePolicyStatus = z.infer<typeof releasePolicyStatusSchema>;

export const releaseIdentitySchema = z.object({
  gameId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/),
  manifestSha256: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type ReleaseIdentity = z.infer<typeof releaseIdentitySchema>;

export const releaseControlEventSchema = releaseIdentitySchema.extend({
  type: z.literal("release-status"),
  status: releasePolicyStatusSchema,
  changedAt: z.number().int().nonnegative(),
});
export type ReleaseControlEvent = z.infer<typeof releaseControlEventSchema>;

export function releaseIdentityKey(identity: ReleaseIdentity): string {
  return `${identity.gameId}@${identity.version}:${identity.manifestSha256.toLowerCase()}`;
}

export function encodeReleaseIdentity(identity: ReleaseIdentity): string {
  return JSON.stringify({
    gameId: identity.gameId,
    version: identity.version,
    manifestSha256: identity.manifestSha256.toLowerCase(),
  });
}

export function parseReleaseIdentity(encoded: string): ReleaseIdentity | null {
  if (encoded.length > 512) return null;
  try {
    const parsed = releaseIdentitySchema.safeParse(JSON.parse(encoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
