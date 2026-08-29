import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const consumeRateLimit = internalMutation({
  args: {
    key: v.string(),
    max: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!existing) {
      await ctx.db.insert("rateLimits", { key: args.key, count: 1, windowStartedAt: now });
      return;
    }
    if (now - existing.windowStartedAt >= args.windowMs) {
      await ctx.db.patch(existing._id, { count: 1, windowStartedAt: now });
      return;
    }
    if (existing.count >= args.max) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "Too many attempts; try again later",
      });
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  },
});
