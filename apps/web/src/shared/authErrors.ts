export type AuthOperation = "signIn" | "signUp" | "google" | "callback" | "reset";

const MESSAGES: Readonly<Record<string, string>> = {
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  DEVICE_CODE_INVALID: "Check the code shown on your other screen.",
  DEVICE_CODE_EXPIRED: "This sign-in code has expired or was already used. Generate a new QR code.",
  RATE_LIMITED: "Too many attempts. Wait a moment before trying again.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_NAME: "Player name must be 2–48 characters.",
  INVALID_PASSWORD: "Use a password between 8 and 128 characters.",
  AUTH_RATE_LIMITED: "Too many sign-in attempts. Wait before trying again, or use password reset.",
  ACCOUNT_ACTION_REQUIRED:
    "This account could not be created or linked. Try your original sign-in method, or reset your password.",
  INVALID_RESET_CODE: "The reset code is invalid or expired. Request a new code and try again.",
  AUTH_UNAVAILABLE: "The sign-in service could not complete this request. Try again shortly.",
};

function dataCode(reason: unknown): string | undefined {
  if (typeof reason !== "object" || reason === null) return;
  const data = (reason as { data?: unknown }).data;
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string"
  ) {
    return data.code;
  }
}

/** Never render arbitrary backend text, traces, OAuth URLs, email or credentials. */
export function authErrorMessage(reason: unknown, operation: AuthOperation = "signIn"): string {
  const raw = reason instanceof Error ? reason.message : "";
  const code = dataCode(reason);
  let message = code ? MESSAGES[code] : undefined;
  if (!message && /\bInvalidAccountId\b|\bInvalidSecret\b|Invalid credentials/i.test(raw)) {
    message = MESSAGES.INVALID_CREDENTIALS;
  }
  if (!message && /\bTooManyFailedAttempts\b/i.test(raw)) message = MESSAGES.AUTH_RATE_LIMITED;
  if (!message && /SecurityError|storage.*(?:denied|blocked)|access.*storage/i.test(raw)) {
    message =
      "This browser blocked sign-in storage. Open Play Together in a browser tab and sign in there.";
  }
  if (!message && /Failed to fetch|NetworkError|network request failed|offline/i.test(raw)) {
    message = "Could not reach the sign-in service. Check your connection and try again.";
  }
  message ??=
    operation === "google" || operation === "callback"
      ? "Google sign-in was not completed. Try again in a browser tab, using the same browser where you started."
      : operation === "signUp"
        ? "Account creation could not be completed. Try signing in or use password reset; contact support if it keeps failing."
        : "Sign-in could not be completed. Try again; contact support if it keeps failing.";
  return message;
}

export function authErrorDetails(reason: unknown, operation: AuthOperation = "signIn") {
  const raw = reason instanceof Error ? reason.message : "";
  const reference = /\[Request ID:\s*([a-f0-9]{16,32})\]/i.exec(raw)?.[1]?.toLowerCase();
  return {
    title: operation === "signUp" ? "Account not created" : "Could not sign in",
    description: authErrorMessage(reason, operation),
    reference,
  };
}
