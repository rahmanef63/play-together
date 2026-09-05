import { Button } from "../../../shared/ui/Button";

export function GoogleAuthButton({
  enabled,
  busy,
  embedded,
  onClick,
}: {
  enabled: boolean | undefined;
  busy: boolean;
  embedded: boolean;
  onClick: () => void;
}) {
  if (enabled !== true) return null;
  return (
    <>
      <Button type="button" variant="outline" fullWidth busy={busy} onClick={onClick}>
        <GoogleIcon />
        <span>{embedded ? "Continue with Google in browser" : "Continue with Google"}</span>
      </Button>
      {embedded && (
        <p className="microcopy auth-copy">
          Google requires a browser tab. After sign-in, continue playing in that tab; preview
          sessions are separate.
        </p>
      )}
      <div className="auth-divider">
        <span>or use email</span>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.39a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.97-4.33 2.97-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}
