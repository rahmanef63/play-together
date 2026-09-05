import type { ConvexCredentialsConfig } from "@convex-dev/auth/server";
import { publicAuthFailure } from "./authErrors";

/**
 * Convex Auth 0.0.95 factories put the real authorize function in `options`.
 * Flatten those trusted factory options before wrapping; otherwise the SDK merges
 * them later and silently replaces a top-level error wrapper with the original.
 */
export function withPublicAuthErrors(factory: ConvexCredentialsConfig): ConvexCredentialsConfig {
  const { options, ...defaults } = factory as ConvexCredentialsConfig & {
    options?: Partial<ConvexCredentialsConfig>;
  };
  const configured: ConvexCredentialsConfig = { ...defaults, ...options };
  const authorize = configured.authorize;
  if (typeof authorize !== "function")
    throw new Error("Password provider configuration is invalid");
  return {
    ...configured,
    authorize: async (params, ctx) => {
      try {
        return await authorize(params, ctx);
      } catch (reason) {
        const failure = publicAuthFailure(reason, params.flow);
        if (failure.data.code === "AUTH_UNAVAILABLE") {
          console.error("Unexpected password provider failure");
        }
        throw failure;
      }
    },
  };
}
