import { useAuthActions } from "@convex-dev/auth/react";
import { type FormEvent, useState } from "react";

export function AuthPage() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signUp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
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
        <div className="segmented" role="tablist" aria-label="Account mode">
          <button
            type="button"
            className={mode === "signUp" ? "active" : ""}
            onClick={() => setMode("signUp")}
          >
            Create account
          </button>
          <button
            type="button"
            className={mode === "signIn" ? "active" : ""}
            onClick={() => setMode("signIn")}
          >
            Sign in
          </button>
        </div>
        <form onSubmit={submit}>
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
            minLength={8}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button full" type="submit" disabled={busy}>
            {busy ? "Connecting…" : mode === "signUp" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="microcopy">
          Passwords require at least 8 characters with a letter and number.
        </p>
      </section>
    </main>
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
