import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  DEVICE_LOGIN_TTL_MS,
  DEVICE_POLL_MS,
  deviceLoginState,
  sameDeviceProof,
  validDeviceProof,
} from "./_shared/deviceLoginPolicy";

export const issue = internalMutation({
  args: { codeHash: v.string(), proofHash: v.string(), label: v.string() },
  handler: async (ctx, args) => {
    if (!validDeviceProof(args.proofHash) || !validDeviceProof(args.codeHash))
      throw new ConvexError({ code: "DEVICE_CODE_INVALID" });
    const collision = await ctx.db
      .query("deviceLogins")
      .withIndex("by_code", (q) => q.eq("codeHash", args.codeHash))
      .first();
    if (collision) return null;
    const now = Date.now(),
      expiresAt = now + DEVICE_LOGIN_TTL_MS;
    const id = await ctx.db.insert("deviceLogins", {
      ...args,
      label: args.label.slice(0, 64),
      state: "pending",
      createdAt: now,
      expiresAt,
      lastPollAt: 0,
    });
    return { id, expiresAt };
  },
});
export const inspect = internalQuery({
  args: { codeHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("deviceLogins")
      .withIndex("by_code", (q) => q.eq("codeHash", args.codeHash))
      .unique();
    if (!request || deviceLoginState(request, Date.now()) !== "pending") return null;
    return { label: request.label, createdAt: request.createdAt, expiresAt: request.expiresAt };
  },
});
export const poll = internalMutation({
  args: { id: v.id("deviceLogins"), proofHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request || !sameDeviceProof(request.proofHash, args.proofHash))
      return { state: "expired" };
    const now = Date.now(),
      state = deviceLoginState(request, now);
    if (state !== "pending" && state !== "approved") return { state };
    if (now - request.lastPollAt < DEVICE_POLL_MS - 300) return { state: "slow_down" };
    await ctx.db.patch(request._id, { lastPollAt: now });
    return { state };
  },
});
export const decide = internalMutation({
  args: { codeHash: v.string(), userId: v.id("users"), approve: v.boolean() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("deviceLogins")
      .withIndex("by_code", (q) => q.eq("codeHash", args.codeHash))
      .unique();
    if (
      !request ||
      deviceLoginState(request, Date.now()) !== "pending" ||
      !(await ctx.db.get(args.userId))
    )
      throw new ConvexError({ code: "DEVICE_CODE_EXPIRED" });
    await ctx.db.patch(request._id, {
      state: args.approve ? "approved" : "denied",
      ...(args.approve ? { approvedBy: args.userId } : {}),
    });
    return { approved: args.approve };
  },
});
export const consume = internalMutation({
  args: { id: v.id("deviceLogins"), proofHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (
      !request ||
      !sameDeviceProof(request.proofHash, args.proofHash) ||
      deviceLoginState(request, Date.now()) !== "approved" ||
      !request.approvedBy
    )
      throw new ConvexError({ code: "DEVICE_CODE_EXPIRED" });
    if (!(await ctx.db.get(request.approvedBy)))
      throw new ConvexError({ code: "DEVICE_CODE_EXPIRED" });
    // Approval + original-device proof are consumed in a single transaction.
    await ctx.db.patch(request._id, { state: "consumed" });
    return request.approvedBy;
  },
});
export const cancel = internalMutation({
  args: { id: v.id("deviceLogins"), proofHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (
      request &&
      sameDeviceProof(request.proofHash, args.proofHash) &&
      ["pending", "approved"].includes(request.state)
    )
      await ctx.db.patch(request._id, { state: "cancelled" });
    return null;
  },
});
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("deviceLogins")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now()))
      .take(200);
    for (const row of expired) await ctx.db.delete(row._id);
    return expired.length;
  },
});
