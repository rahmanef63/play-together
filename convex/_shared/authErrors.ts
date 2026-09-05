import { ConvexError } from "convex/values";

const PUBLIC_CODES = new Set([
  "INVALID_EMAIL",
  "INVALID_NAME",
  "INVALID_PASSWORD",
  "INVALID_CREDENTIALS",
  "AUTH_RATE_LIMITED",
  "ACCOUNT_ACTION_REQUIRED",
  "AUTH_UNAVAILABLE",
  "INVALID_RESET_CODE",
]);

/** Translate expected auth failures without exposing accounts, secrets or library internals. */
export function publicAuthFailure(reason: unknown, flow: unknown): ConvexError<{ code: string }> {
  if (reason instanceof ConvexError && typeof reason.data === "object" && reason.data !== null) {
    const code = (reason.data as { code?: unknown }).code;
    if (typeof code === "string" && PUBLIC_CODES.has(code)) return new ConvexError({ code });
  }
  const message = reason instanceof Error ? reason.message : "";
  if (/\bTooManyFailedAttempts\b|too many (?:failed )?attempts/i.test(message)) {
    return new ConvexError({ code: "AUTH_RATE_LIMITED" });
  }
  if (/\bInvalidAccountId\b|\bInvalidSecret\b|Invalid credentials/i.test(message)) {
    return new ConvexError({ code: "INVALID_CREDENTIALS" });
  }
  if (/Password must be|Invalid password/i.test(message)) {
    return new ConvexError({ code: "INVALID_PASSWORD" });
  }
  if (/already (?:registered|exists)|multiple accounts|password account/i.test(message)) {
    return new ConvexError({ code: "ACCOUNT_ACTION_REQUIRED" });
  }
  if (flow === "reset-verification" && /Invalid code|expired/i.test(message)) {
    return new ConvexError({ code: "INVALID_RESET_CODE" });
  }
  // Never misclassify a database/network/programming failure as a bad password.
  return new ConvexError({ code: "AUTH_UNAVAILABLE" });
}
