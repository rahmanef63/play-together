import { useAuthActions } from "@convex-dev/auth/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { authErrorMessage } from "../../shared/authErrors";
import { Button } from "../../shared/ui/Button";
import { FormMessage } from "../../shared/ui/FormMessage";

/** Handle rejected callbacks instead of leaving an unhandled SDK promise. */
export function AuthCallbackBoundary({ children }: { children: ReactNode }) {
  const { signIn } = useAuthActions();
  // The installed SDK uses this undefined-provider exchange internally. Its public
  // action declaration omits that overload; keep the compatibility typing local.
  const exchange = signIn as (
    provider: string | undefined,
    params: { code: string },
  ) => ReturnType<typeof signIn>;
  const [callback] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get("code"),
      expected: params.get("authCallback") === "google",
      providerError: params.has("error"),
    };
  });
  const activeCallback = Boolean(callback.code || callback.expected || callback.providerError);
  const [done, setDone] = useState(!activeCallback);
  const [error, setError] = useState("");
  const task = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    if (!activeCallback || done) return;
    let active = true;
    if (!task.current) {
      const url = new URL(window.location.href);
      for (const key of ["code", "authCallback", "error", "error_description", "error_uri"])
        url.searchParams.delete(key);
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      task.current = callback.code
        ? exchange(undefined, { code: callback.code }).then((result) => {
            if (!result.signingIn) throw new Error("Authentication did not complete");
          })
        : Promise.reject(new Error("Google sign-in was not completed"));
    }
    void task.current.then(
      () => {
        if (active) setDone(true);
      },
      (reason: unknown) => {
        if (active) setError(authErrorMessage(reason, "callback"));
      },
    );
    return () => {
      active = false;
    };
  }, [activeCallback, callback, done, exchange]);
  if (done) return children;
  return (
    <main className="centered-state" aria-label="Complete sign-in">
      <section className="auth-card panel">
        <h1>{error ? "Sign-in was not completed" : "Completing sign-in…"}</h1>
        {error ? (
          <>
            <FormMessage>{error}</FormMessage>
            <Button type="button" onClick={() => setDone(true)}>
              Back to sign in
            </Button>
          </>
        ) : (
          <p role="status">Checking your sign-in securely. Do not close this tab.</p>
        )}
      </section>
    </main>
  );
}
