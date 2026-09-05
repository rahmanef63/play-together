import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
  DEVICE_POLL_MS,
  deviceDigest,
  normalizeDeviceCode,
  randomDeviceCode,
  validDeviceProof,
} from "./_shared/deviceLoginPolicy";
import { requireActionUser } from "./_shared/guards";

export const start = action({
  args: { proofHash: v.string(), clientId: v.string(), label: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"deviceLogins">; code: string; expiresAt: number; intervalMs: number }> => {
    if (
      !validDeviceProof(args.proofHash) ||
      !/^[a-f0-9]{32}$/.test(args.clientId) ||
      args.label.length > 64
    )
      throw new ConvexError({ code: "DEVICE_CODE_INVALID" });
    // Persistent client limit plus a global ceiling bounds anonymous allocation.
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `device-start:${args.clientId}`,
      max: 6,
      windowMs: 60_000,
    });
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: "device-start:global",
      max: 120,
      windowMs: 60_000,
    });
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strip control characters from untrusted display metadata
    const label = args.label.replace(/[\x00-\x1f\x7f]/g, "").trim() || "Play Together screen";
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomDeviceCode();
      const request = await ctx.runMutation(internal.deviceLoginInternals.issue, {
        codeHash: await deviceDigest(code),
        proofHash: args.proofHash,
        label,
      });
      if (request) return { ...request, code, intervalMs: DEVICE_POLL_MS };
    }
    throw new ConvexError({ code: "AUTH_UNAVAILABLE" });
  },
});
export const status = action({
  args: { id: v.id("deviceLogins"), proof: v.string() },
  handler: async (ctx, args): Promise<{ state: string }> => {
    if (!validDeviceProof(args.proof)) return { state: "expired" };
    return ctx.runMutation(internal.deviceLoginInternals.poll, {
      id: args.id,
      proofHash: await deviceDigest(args.proof),
    });
  },
});
export const cancel = action({
  args: { id: v.id("deviceLogins"), proof: v.string() },
  handler: async (ctx, args): Promise<null> => {
    if (!validDeviceProof(args.proof)) return null;
    return ctx.runMutation(internal.deviceLoginInternals.cancel, {
      id: args.id,
      proofHash: await deviceDigest(args.proof),
    });
  },
});
export const inspect = action({
  args: { code: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ label: string; createdAt: number; expiresAt: number } | null> => {
    const userId = await requireActionUser(ctx);
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `device-inspect:${userId}`,
      max: 15,
      windowMs: 60_000,
    });
    return ctx.runQuery(internal.deviceLoginInternals.inspect, {
      codeHash: await deviceDigest(normalizeDeviceCode(args.code)),
    });
  },
});
export const decide = action({
  args: { code: v.string(), approve: v.boolean() },
  handler: async (ctx, args): Promise<{ approved: boolean }> => {
    const userId = await requireActionUser(ctx);
    await ctx.runMutation(internal.security.consumeRateLimit, {
      key: `device-decide:${userId}`,
      max: 10,
      windowMs: 60_000,
    });
    return ctx.runMutation(internal.deviceLoginInternals.decide, {
      codeHash: await deviceDigest(normalizeDeviceCode(args.code)),
      userId,
      approve: args.approve,
    });
  },
});
