import { formatDeviceCode, MAX_DEVICE_CODE_INPUT } from "@play-together/contracts";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { navigate } from "../../shared/navigation";
import type { CurrentUser } from "../../shared/types";
import { Button } from "../../shared/ui/Button";
import { InputField } from "../../shared/ui/FormField";
import { useDeviceApproval } from "./model/useDeviceApproval";

const QrScanner = lazy(() =>
  import("./scanner/QrScanner").then((module) => ({ default: module.QrScanner })),
);

export function DeviceApprovalPage({ user }: { user: CurrentUser }) {
  const approval = useDeviceApproval();
  const [scanning, setScanning] = useState(false);
  const { request, done, busy, checked, error, code } = approval;
  const reviewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (request) {
      reviewRef.current?.focus({ preventScroll: true });
      reviewRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [request]);
  return (
    <main className="device-approval-page">
      <section className="device-approval-card">
        <header className="pairing-header">
          <button type="button" onClick={() => navigate("/")}>
            Back to games
          </button>
          <span>{user.name}</span>
        </header>
        <h1>{done ?? "Connect another screen"}</h1>
        {done ? (
          <>
            <p>
              {done === "Device approved"
                ? "Your other screen can now finish signing in. This code cannot be used again."
                : "No access was granted to the other screen."}
            </p>
            <Button onClick={() => navigate("/")}>Back to games</Button>
          </>
        ) : (
          <>
            {!request && (
              <>
                <p>
                  Use this signed-in phone to approve a TV, computer or another browser. Keep that
                  screen open.
                </p>
                {scanning ? (
                  <Suspense fallback={<p role="status">Preparing scanner…</p>}>
                    <QrScanner
                      onClose={() => setScanning(false)}
                      onRead={(value) => {
                        setScanning(false);
                        void approval.review(value);
                      }}
                    />
                  </Suspense>
                ) : (
                  <button
                    type="button"
                    className="pair-scan-button"
                    onClick={() => setScanning(true)}
                  >
                    Scan QR with this phone
                  </button>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void approval.review();
                  }}
                  noValidate
                >
                  <InputField
                    label="Or enter the sign-in code"
                    hint="8 characters"
                    name="pairCode"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="ABCD-EFGH"
                    value={code}
                    onChange={(event) => approval.update(event.target.value)}
                    maxLength={MAX_DEVICE_CODE_INPUT}
                    aria-describedby="pair-code-hint"
                    aria-invalid={Boolean(error)}
                  />
                  <p id="pair-code-hint" className="pair-code-hint">
                    Spaces, dashes and lowercase letters all work. Use the sign-in code, not a room
                    code or support ID.
                  </p>
                  <Button type="submit" busy={busy}>
                    Review device
                  </Button>
                </form>
              </>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {request && (
              <section
                className="device-consent"
                aria-label="Approve new device"
                ref={reviewRef}
                tabIndex={-1}
              >
                <h2>{request.label}</h2>
                <strong className="device-code">{formatDeviceCode(request.code)}</strong>
                <p>
                  This signs the other screen into your account. Only approve a device you control
                  and can see now. Never approve a code sent by someone else.
                </p>
                <label className="device-confirm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => approval.setChecked(event.target.checked)}
                  />
                  The code matches my other screen.
                </label>
                <div className="device-actions">
                  <Button
                    busy={busy}
                    disabled={!checked || request.expiresAt <= Date.now()}
                    onClick={() => void approval.respond(true)}
                  >
                    Approve sign-in
                  </Button>
                  <Button
                    variant="outline"
                    busy={busy}
                    onClick={() => void approval.respond(false)}
                  >
                    Decline
                  </Button>
                </div>
                <button
                  className="pair-change-code"
                  type="button"
                  onClick={() => approval.update(code)}
                >
                  Change code
                </button>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
