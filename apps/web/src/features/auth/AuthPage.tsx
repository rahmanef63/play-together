import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "../../shared/convexApi";

type AuthMode = "signIn" | "signUp" | "forgot" | "reset";

export function AuthPage() {
  const { signIn } = useAuthActions();
  const requestPasswordReset = useAction(api.passwordReset.request);
  const resetCapability = useQuery(api.passwordReset.capability);
  const [mode, setMode] = useState<AuthMode>("signUp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode !== "signIn" && mode !== "signUp") return;
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      await signIn("password", {
        flow: mode,
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        ...(mode === "signUp" ? { name: String(data.get("name") ?? "").trim() } : {}),
      });
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  const submitResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetCapability?.enabled !== true) {
      setError("Password reset email is temporarily unavailable.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    try {
      await requestPasswordReset({ email });
      setResetEmail(email);
      setMode("reset");
      setNotice("If that account exists, an 8-digit reset code has been sent to its email.");
    } catch {
      // The request endpoint is intentionally enumeration-safe; this is only for network failures.
      setError("Could not contact the account service. Try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  const submitResetVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmPassword") ?? "");
    if (newPassword !== confirmation) {
      setBusy(false);
      setError("The new passwords do not match.");
      return;
    }
    try {
      await signIn("password", {
        flow: "reset-verification",
        email,
        code: String(data.get("code") ?? "").trim(),
        newPassword,
      });
    } catch {
      setError("The reset code is invalid or expired, or the new password does not meet policy.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark" aria-hidden="true">
          PT
        </div>
        <p className="eyebrow">MULTIPLAYER WITHOUT EXTRA CONTROLLERS</p>
        <h1>Your phone is the console.</h1>
        <p>
          Create a room, put the shared screen on any browser, and let friends join from their
          phones.
        </p>
        <div className="mode-strip">
          <span>Remote only</span>
          <span>Handheld</span>
          <span>Shared screen</span>
        </div>
      </section>
      <section className="auth-card panel">
        {(mode === "signIn" || mode === "signUp") && (
          <div className="segmented" role="tablist" aria-label="Account mode">
            <button
              type="button"
              className={mode === "signUp" ? "active" : ""}
              onClick={() => switchMode("signUp")}
            >
              Create account
            </button>
            <button
              type="button"
              className={mode === "signIn" ? "active" : ""}
              onClick={() => switchMode("signIn")}
            >
              Sign in
            </button>
          </div>
        )}

        {(mode === "signIn" || mode === "signUp") && (
          <form onSubmit={submitAccount}>
            {mode === "signUp" && (
              <Field
                label="Player name"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={48}
              />
            )}
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              minLength={mode === "signUp" ? 12 : 8}
              maxLength={128}
            />
            {error && <FormError>{error}</FormError>}
            <button className="primary-button full" type="submit" disabled={busy}>
              {busy ? "Connecting…" : mode === "signUp" ? "Create account" : "Sign in"}
            </button>
            {mode === "signIn" && (
              <button
                className="auth-link-button"
                type="button"
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
            )}
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={submitResetRequest}>
            <p className="eyebrow">PASSWORD RESET</p>
            <h2>Send a reset code.</h2>
            <p className="microcopy auth-copy">
              Enter your account email. For privacy, the response is the same whether an account
              exists or not.
            </p>
            <Field label="Email" name="email" type="email" autoComplete="email" />
            {error && <FormError>{error}</FormError>}
            <button
              className="primary-button full"
              type="submit"
              disabled={busy || resetCapability?.enabled !== true}
            >
              {busy
                ? "Sending…"
                : resetCapability?.enabled === false
                  ? "Email reset unavailable"
                  : "Send reset code"}
            </button>
            <button className="auth-link-button" type="button" onClick={() => switchMode("signIn")}>
              Back to sign in
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={submitResetVerification}>
            <p className="eyebrow">PASSWORD RESET</p>
            <h2>Set a new password.</h2>
            {notice && (
              <p className="form-notice" role="status">
                {notice}
              </p>
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={resetEmail}
            />
            <Field
              label="8-digit reset code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              minLength={8}
              maxLength={8}
            />
            <Field
              label="New password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
            />
            <Field
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
            />
            {error && <FormError>{error}</FormError>}
            <button className="primary-button full" type="submit" disabled={busy}>
              {busy ? "Updating…" : "Reset password"}
            </button>
            <button className="auth-link-button" type="button" onClick={() => switchMode("forgot")}>
              Send another code
            </button>
          </form>
        )}

        <p className="microcopy">
          New passwords require 12–128 characters with uppercase, lowercase, a number, and a symbol.
          Reset codes expire after 10 minutes.
        </p>
      </section>
    </main>
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setNotice("");
  }
}

function FormError({ children }: { children: string }) {
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} required {...props} />
    </label>
  );
}

function readError(reason: unknown): string {
  if (reason instanceof Error) return reason.message.replace(/^\[CONVEX[^\]]*\]\s*/i, "");
  return "Could not complete authentication";
}
