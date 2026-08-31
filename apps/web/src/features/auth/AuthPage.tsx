import { AuthForms } from "./components/AuthForms";
import { useAuthFlow } from "./model/useAuthFlow";

export function AuthPage() {
  const auth = useAuthFlow();
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
      <AuthForms
        mode={auth.mode}
        busy={auth.busy}
        error={auth.error}
        notice={auth.notice}
        resetEmail={auth.resetEmail}
        resetEnabled={auth.resetCapability?.enabled}
        onModeChange={auth.switchMode}
        onAccount={(event) => void auth.submitAccount(event)}
        onResetRequest={(event) => void auth.submitResetRequest(event)}
        onResetVerification={(event) => void auth.submitResetVerification(event)}
      />
    </main>
  );
}
