import { z } from "zod";

export const remoteDisplayPolicySchema = z
  .object({
    mode: z.enum(["shared", "per-player"]),
    maxViewports: z.number().int().min(1).max(4),
  })
  .refine((value) => value.mode !== "shared" || value.maxViewports === 1, {
    message: "Shared presentation uses exactly one viewport",
  });
export type RemoteDisplayPolicy = z.infer<typeof remoteDisplayPolicySchema>;

export const DEFAULT_REMOTE_DISPLAY_POLICY: RemoteDisplayPolicy = {
  mode: "shared",
  maxViewports: 1,
};
