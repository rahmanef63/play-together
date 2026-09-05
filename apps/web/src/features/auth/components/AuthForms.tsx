import type { FormEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { InputField } from "../../../shared/ui/FormField";
import { FormMessage } from "../../../shared/ui/FormMessage";
import type { AuthMode } from "../model/useAuthFlow";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function AuthForms({
  mode,
  busy,
  embedded,
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
  embedded: boolean;
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
          <GoogleAuthButton
            enabled={googleEnabled}
            busy={busy}
            embedded={embedded}
            onClick={onGoogle}
          />
          {notice && <FormMessage variant="notice">{notice}</FormMessage>}
          <form onSubmit={onAccount}>
            {mode === "signUp" && (
              <InputField
                label="Player name"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={48}
                required
              />
            )}
            <InputField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "auth-field-error" : undefined}
            />
            <InputField
              label="Password"
              name="password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "auth-field-error" : undefined}
              type="password"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              required
            />
            {error && (
              <p className="auth-inline-error" id="auth-field-error">
                {error}
              </p>
            )}
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
          <InputField label="Email" name="email" type="email" autoComplete="email" required />
          {error && <FormMessage>{error}</FormMessage>}
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
          {notice && <FormMessage variant="notice">{notice}</FormMessage>}
          <InputField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={resetEmail}
            required
          />
          <InputField
            label="8-digit reset code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            minLength={8}
            maxLength={8}
            required
          />
          <InputField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <InputField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          {error && <FormMessage>{error}</FormMessage>}
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
