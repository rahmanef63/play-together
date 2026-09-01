import type { FormEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import type { AuthMode } from "../model/useAuthFlow";
import { AuthField, FormError } from "./AuthField";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function AuthForms({
  mode,
  busy,
  error,
  notice,
  resetEmail,
  resetEnabled,
  googleEnabled,
  onModeChange,
  onAccount,
  onResetRequest,
  onResetVerification,
  onGoogle,
}: {
  mode: AuthMode;
  busy: boolean;
  error: string;
  notice: string;
  resetEmail: string;
  resetEnabled: boolean | undefined;
  googleEnabled: boolean | undefined;
  onModeChange: (mode: AuthMode) => void;
  onAccount: (event: FormEvent<HTMLFormElement>) => void;
  onResetRequest: (event: FormEvent<HTMLFormElement>) => void;
  onResetVerification: (event: FormEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
}) {
  const accountMode = mode === "signIn" || mode === "signUp";
  return (
    <section className="auth-card panel">
      {accountMode && (
        <div className="segmented" role="tablist" aria-label="Account mode">
          <button
            type="button"
            className={mode === "signUp" ? "active" : ""}
            onClick={() => onModeChange("signUp")}
          >
            Create account
          </button>
          <button
            type="button"
            className={mode === "signIn" ? "active" : ""}
            onClick={() => onModeChange("signIn")}
          >
            Sign in
          </button>
        </div>
      )}
      {accountMode && (
        <>
          <GoogleAuthButton enabled={googleEnabled} busy={busy} onClick={onGoogle} />
          <form onSubmit={onAccount}>
            {mode === "signUp" && (
              <AuthField
                label="Player name"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={48}
              />
            )}
            <AuthField label="Email" name="email" type="email" autoComplete="email" />
            <AuthField
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
            />
            {error && <FormError>{error}</FormError>}
            <Button type="submit" fullWidth busy={busy}>
              {busy ? "Connecting…" : mode === "signUp" ? "Create account" : "Sign in"}
            </Button>
            {mode === "signIn" && (
              <button
                className="auth-link-button"
                type="button"
                onClick={() => onModeChange("forgot")}
              >
                Forgot password?
              </button>
            )}
          </form>
        </>
      )}
      {mode === "forgot" && (
        <form onSubmit={onResetRequest}>
          <p className="eyebrow">PASSWORD RESET</p>
          <h2>Send a reset code.</h2>
          <p className="microcopy auth-copy">
            Enter your account email. For privacy, the response is the same whether an account
            exists or not.
          </p>
          <AuthField label="Email" name="email" type="email" autoComplete="email" />
          {error && <FormError>{error}</FormError>}
          <Button type="submit" fullWidth busy={busy} disabled={resetEnabled !== true}>
            {busy
              ? "Sending…"
              : resetEnabled === false
                ? "Email reset unavailable"
                : "Send reset code"}
          </Button>
          <button className="auth-link-button" type="button" onClick={() => onModeChange("signIn")}>
            Back to sign in
          </button>
        </form>
      )}
      {mode === "reset" && (
        <form onSubmit={onResetVerification}>
          <p className="eyebrow">PASSWORD RESET</p>
          <h2>Set a new password.</h2>
          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={resetEmail}
          />
          <AuthField
            label="8-digit reset code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            minLength={8}
            maxLength={8}
          />
          <AuthField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
          />
          <AuthField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
          />
          {error && <FormError>{error}</FormError>}
          <Button type="submit" fullWidth busy={busy}>
            {busy ? "Updating…" : "Reset password"}
          </Button>
          <button className="auth-link-button" type="button" onClick={() => onModeChange("forgot")}>
            Send another code
          </button>
        </form>
      )}
      <p className="microcopy">
        Use at least 8 characters. A longer passphrase is easier to remember and harder to guess.
        Reset codes expire after 10 minutes.
      </p>
    </section>
  );
}
