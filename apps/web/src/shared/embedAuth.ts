export function isEmbedded(): boolean {
  return window.parent !== window;
}

/** Highlight the host's reviewed login button. This message cannot open a URL or carry a session. */
export function requestExternalGoogleSignIn(): void {
  if (!isEmbedded()) return;
  window.parent.postMessage(
    { type: "mso:app-auth-request", schemaVersion: 1, provider: "google" },
    "*",
  );
}
