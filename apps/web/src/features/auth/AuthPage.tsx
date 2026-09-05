import { lazy, Suspense, useState } from "react";
import { AuthForms } from "./components/AuthForms";

const DeviceLoginCard = lazy(() =>
  import("./components/DeviceLoginCard").then((module) => ({ default: module.DeviceLoginCard })),
);

import { useAuthFlow } from "./model/useAuthFlow";

export function AuthPage() {
  const auth = useAuthFlow();
  const [entry, setEntry] = useState<"email" | "qr">("email");
  return (
    <main className="auth-page console-auth">
      <section className="auth-hero">
        <div className="auth-wordmark" role="img" aria-label="Play Together">
          PLAY
          <br />
          TOGETHER<span aria-hidden="true">.</span>
        </div>
        <h1>Your phone is the console.</h1>
        <p>One room. Your screens. Everyone plays.</p>
        <div className="auth-hardware" aria-hidden="true">
          <span>A</span>
          <span>B</span>
          <span>X</span>
          <span>Y</span>
        </div>
        <a href={auth.embedded ? "/embed/tv.html" : "/tv.html"}>TV compatibility</a>
      </section>
      <section className="auth-entry" aria-label="Choose how to sign in">
        <header className="auth-entry-heading">
          <h2>
            {location.pathname.endsWith("/device") ? "Sign in on this phone" : "Ready to play?"}
          </h2>
          <p>
            {location.pathname.endsWith("/device")
              ? "After signing in, review the code from your other screen."
              : "Choose how to connect."}
          </p>
        </header>
        <nav className="auth-entry-tabs" aria-label="Sign-in methods">
          <button type="button" aria-pressed={entry === "email"} onClick={() => setEntry("email")}>
            Email / Google
          </button>
          <button type="button" aria-pressed={entry === "qr"} onClick={() => setEntry("qr")}>
            QR sign-in
          </button>
        </nav>
        <div className="auth-entry-body">
          {entry === "qr" ? (
            <Suspense
              fallback={
                <p className="microcopy" role="status">
                  Preparing device sign-in…
                </p>
              }
            >
              <DeviceLoginCard />
            </Suspense>
          ) : (
            <AuthForms
              mode={auth.mode}
              busy={auth.busy}
              embedded={auth.embedded}
              error={auth.error}
              notice={auth.notice}
              resetEmail={auth.resetEmail}
              resetEnabled={auth.resetCapability?.enabled}
              googleEnabled={auth.authCapabilities?.google}
              onModeChange={auth.switchMode}
              onGoogle={() => void auth.signInWithGoogle()}
              onAccount={(event) => void auth.submitAccount(event)}
              onResetRequest={(event) => void auth.submitResetRequest(event)}
              onResetVerification={(event) => void auth.submitResetVerification(event)}
            />
          )}
        </div>
        <a className="auth-tv-help" href={auth.embedded ? "/embed/tv.html" : "/tv.html"}>
          Playing on a TV? Check compatibility
        </a>
      </section>
    </main>
  );
}
