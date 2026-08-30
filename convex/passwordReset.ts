import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, query } from "./_generated/server";

const GENERIC_RESPONSE = { accepted: true as const };

export const capability = query({
  args: {},
  handler: async () => ({
    enabled: Boolean(process.env.RESEND_API_KEY?.trim()),
  }),
});

export const request = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email) return GENERIC_RESPONSE;
    const emailHash = await sha256(email);
    try {
      await ctx.runMutation(internal.security.consumeRateLimit, {
        key: `password-reset:15m:${emailHash}`,
        max: 3,
        windowMs: 15 * 60_000,
      });
      await ctx.runMutation(internal.security.consumeRateLimit, {
        key: `password-reset:day:${emailHash}`,
        max: 10,
        windowMs: 24 * 60 * 60_000,
      });
    } catch {
      return GENERIC_RESPONSE;
    }
    try {
      await ctx.runAction(api.auth.signIn, {
        provider: "password",
        params: { flow: "reset", email },
        calledBy: "passwordReset.request",
      });
    } catch {
      // Deliberately hide account existence and provider-delivery details from callers.
    }
    return GENERIC_RESPONSE;
  },
});

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
