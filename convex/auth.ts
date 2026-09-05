import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import type { AnyDataModel, GenericMutationCtx } from "convex/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { authCapabilities } from "./_shared/authCapabilities";
import { deviceLoginProvider } from "./_shared/deviceLoginProvider";
import { hashSecret, verifySecret } from "./_shared/passwordCrypto";
import { validateAccountPassword } from "./_shared/passwordPolicy";
import { withPublicAuthErrors } from "./_shared/passwordProvider";
import { sendPasswordResetEmail } from "./_shared/resendEmail";

const resetEmail = {
  ...Email({
    sendVerificationRequest: async ({ identifier, token, expires }) => {
      await sendPasswordResetEmail({ identifier, token, expires });
    },
  }),
  id: "password-reset",
  name: "Password reset",
  maxAge: 10 * 60,
  from: `${process.env.EMAIL_PROJECT_NAME ?? "Play Together"} <${process.env.EMAIL_FROM_ADDRESS ?? "official@rahmanef.com"}>`,
  generateVerificationToken: async () => randomNumericCode(8),
};

const passwordProvider = withPublicAuthErrors(
  Password({
    profile(params) {
      const email = normalizeEmail(params.email);
      const profile: Record<string, string> & { email: string } = { email };
      if (params.flow === "signUp") {
        const name = String(params.name ?? "").trim();
        if (name.length < 2 || name.length > 48) {
          throw new ConvexError({ code: "INVALID_NAME", message: "Name must be 2–48 characters" });
        }
        profile.name = name;
      }
      return profile;
    },
    reset: resetEmail,
    validatePasswordRequirements: validateAccountPassword,
    crypto: { hashSecret, verifySecret },
  }),
);

const { google: googleConfigured } = authCapabilities();
const providers = googleConfigured
  ? [passwordProvider, deviceLoginProvider, Google]
  : [passwordProvider, deviceLoginProvider];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
  signIn: { maxFailedAttempsPerHour: 8 },
  session: {
    totalDurationMs: 1000 * 60 * 60 * 24 * 14,
    inactiveDurationMs: 1000 * 60 * 60 * 24 * 7,
  },
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;
      const email =
        typeof args.profile.email === "string" ? normalizeEmail(args.profile.email) : undefined;
      const existing = email ? await usersByEmail(ctx, email) : [];
      if (existing.length > 1) throw new ConvexError({ code: "ACCOUNT_ACTION_REQUIRED" });
      const current = existing[0];
      if (current) {
        if (args.type !== "oauth" || !current.emailVerificationTime) {
          throw new ConvexError({ code: "ACCOUNT_ACTION_REQUIRED" });
        }
        const patch: Record<string, unknown> = {};
        if (!current.name && typeof args.profile.name === "string") patch.name = args.profile.name;
        if (!current.image && typeof args.profile.image === "string")
          patch.image = args.profile.image;
        if (Object.keys(patch).length) await ctx.db.patch(current._id, patch);
        return current._id;
      }
      return (await ctx.db.insert("users", {
        email,
        name: typeof args.profile.name === "string" ? args.profile.name : undefined,
        image: typeof args.profile.image === "string" ? args.profile.image : undefined,
        emailVerificationTime: args.type === "oauth" ? Date.now() : undefined,
      })) as Id<"users">;
    },
  },
});

export const capabilities = query({ args: {}, handler: () => ({ google: googleConfigured }) });
export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get("users", userId);
    return user ? { id: user._id, name: user.name ?? "Player", email: user.email ?? null } : null;
  },
});

function normalizeEmail(value: unknown): string {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError({ code: "INVALID_EMAIL", message: "Use a valid email" });
  }
  return email;
}

async function usersByEmail(ctx: GenericMutationCtx<AnyDataModel>, email: string) {
  type User = { _id: Id<"users">; name?: string; image?: string; emailVerificationTime?: number };
  return await (
    ctx.db as unknown as {
      query: (table: "users") => {
        withIndex: (
          index: "email",
          fn: (q: { eq: (field: "email", value: string) => unknown }) => unknown,
        ) => { take: (count: number) => Promise<User[]> };
      };
    }
  )
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(2);
}

function randomNumericCode(length: number): string {
  const ceiling = 10 ** length;
  const maxAccepted = Math.floor(0x1_0000_0000 / ceiling) * ceiling;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while ((values[0] ?? maxAccepted) >= maxAccepted);
  return String((values[0] ?? 0) % ceiling).padStart(length, "0");
}
