import { useAction } from "convex/react";
import { type FormEvent, useState } from "react";
import { authErrorMessage } from "../../shared/authErrors";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { useToast } from "../../shared/ToastProvider";
import type { CurrentUser } from "../../shared/types";
import { Button } from "../../shared/ui/Button";
import { InputField } from "../../shared/ui/FormField";

export function DeviceApprovalPage({ user }: { user: CurrentUser }) {
  const inspect = useAction(api.deviceLogin.inspect),
    decide = useAction(api.deviceLogin.decide),
    notify = useToast();
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get("pair") ?? "");
  const [request, setRequest] = useState<{ label: string; expiresAt: number } | null>(null);
  const [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState<string | null>(null),
    [error, setError] = useState("");
  const normalized = code.replace(/[ -]/g, "").toUpperCase();
  async function load(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setRequest(null);
    setChecked(false);
    try {
      const result = await inspect({ code: normalized });
      if (!result) throw new Error("expired");
      setRequest(result);
    } catch {
      setError("This code is invalid or expired. Generate a new one on the other device.");
    } finally {
      setBusy(false);
    }
  }
  async function respond(approve: boolean) {
    if (approve && !checked) return;
    setBusy(true);
    setError("");
    try {
      await decide({ code: normalized, approve });
      setDone(approve ? "Device approved" : "Request declined");
      notify({
        title: approve ? "Device approved" : "Request declined",
        description: approve
          ? "Your other screen can now finish signing in."
          : "No access was granted.",
        tone: approve ? "success" : "info",
      });
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="device-approval-page">
      <section className="panel device-approval-card">
        <p className="eyebrow">DEVICE SIGN-IN</p>
        <h1>{done ?? "Connect another screen"}</h1>
        <p>
          Signed in as <strong>{user.name}</strong>
        </p>
        {done ? (
          <>
            <p>
              {done === "Device approved"
                ? "Return to your other screen. This code can only be used once."
                : "The other screen was not signed in."}
            </p>
            <Button onClick={() => navigate("/")}>Back to games</Button>
          </>
        ) : (
          <>
            <form onSubmit={load}>
              <InputField
                label="Code on the other screen"
                name="pairCode"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setRequest(null);
                  setChecked(false);
                }}
                minLength={8}
                maxLength={9}
                required
              />
              <Button type="submit" busy={busy}>
                Review device
              </Button>
            </form>
            {request && (
              <section className="device-consent" aria-label="Approve new device">
                <p className="eyebrow">CHECK BOTH SCREENS</p>
                <h2>{request.label}</h2>
                <strong className="device-code">
                  {normalized.slice(0, 4)}-{normalized.slice(4)}
                </strong>
                <p>
                  This will sign the requesting screen into your account. Only approve a device you
                  own or trust and can see now. Never approve a code someone sent you.
                </p>
                <label className="device-confirm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                  />
                  The code matches my other screen.
                </label>
                <div className="device-actions">
                  <Button
                    busy={busy}
                    disabled={!checked || request.expiresAt <= Date.now()}
                    onClick={() => void respond(true)}
                  >
                    Approve sign-in
                  </Button>
                  <Button variant="outline" busy={busy} onClick={() => void respond(false)}>
                    Decline
                  </Button>
                </div>
              </section>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="auth-link-button" type="button" onClick={() => navigate("/")}>
              Back to games
            </button>
          </>
        )}
      </section>
    </main>
  );
}
