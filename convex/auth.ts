import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { hashSecret, verifySecret } from "./_shared/passwordCrypto";
import { validateAccountPassword } from "./_shared/passwordPolicy";
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

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ConvexError({ code: "INVALID_EMAIL", message: "Use a valid email" });
        }
        const profile: Record<string, string> & { email: string } = { email };
        if (params.flow === "signUp") {
          const name = String(params.name ?? "").trim();
          if (name.length < 2 || name.length > 48) {
            throw new ConvexError({
              code: "INVALID_NAME",
              message: "Name must be 2–48 characters",
            });
          }
          profile.name = name;
        }
        return profile;
      },
      reset: resetEmail,
      validatePasswordRequirements: validateAccountPassword,
      // Keep the existing crypto contract so previously-created accounts remain valid.
      crypto: { hashSecret, verifySecret },
    }),
  ],
});

export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get("users", userId);
    return user ? { id: user._id, name: user.name ?? "Player", email: user.email ?? null } : null;
  },
});

function randomNumericCode(length: number): string {
  const ceiling = 10 ** length;
  const maxAccepted = Math.floor(0x1_0000_0000 / ceiling) * ceiling;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while ((values[0] ?? maxAccepted) >= maxAccepted);
  return String((values[0] ?? 0) % ceiling).padStart(length, "0");
}
