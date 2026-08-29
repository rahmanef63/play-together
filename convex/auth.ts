import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { hashSecret, verifySecret } from "./_shared/passwordCrypto";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        const name = String(params.name ?? "").trim();
        if (!email?.includes("@"))
          throw new ConvexError({ code: "INVALID_EMAIL", message: "Use a valid email" });
        if (name.length < 2 || name.length > 48)
          throw new ConvexError({ code: "INVALID_NAME", message: "Name must be 2–48 characters" });
        return { email, name };
      },
      validatePasswordRequirements(password: string) {
        if (password.length < 8 || password.length > 128) {
          throw new ConvexError({
            code: "INVALID_PASSWORD",
            message: "Password must be 8–128 characters",
          });
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          throw new ConvexError({
            code: "INVALID_PASSWORD",
            message: "Password must include a letter and a number",
          });
        }
      },
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
