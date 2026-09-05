import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import type { ConvexCredentialsConfig } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { deviceDigest, validDeviceProof } from "./deviceLoginPolicy";

export const deviceLoginProvider: ConvexCredentialsConfig = ConvexCredentials({
  id: "device-qr",
  authorize: async (params, ctx) => {
    if (
      typeof params.id !== "string" ||
      typeof params.proof !== "string" ||
      !validDeviceProof(params.proof)
    )
      throw new ConvexError({ code: "DEVICE_CODE_EXPIRED" });
    const userId: Id<"users"> = await ctx.runMutation(internal.deviceLoginInternals.consume, {
      id: params.id as Id<"deviceLogins">,
      proofHash: await deviceDigest(params.proof),
    });
    return { userId };
  },
});
