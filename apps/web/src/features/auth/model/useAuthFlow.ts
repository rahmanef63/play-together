import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { authErrorDetails, authErrorMessage } from "../../../shared/authErrors";
import { api } from "../../../shared/convexApi";
import { isEmbedded, requestExternalGoogleSignIn } from "../../../shared/embedAuth";
import { currentPath } from "../../../shared/navigation";
import { useToast } from "../../../shared/ToastProvider";

export type AuthMode = "signIn" | "signUp" | "forgot" | "reset";

export function useAuthFlow() {
  const { signIn } = useAuthActions();
  const notify = useToast();
  const requestPasswordReset = useAction(api.passwordReset.request);
  const authCapabilities = useQuery(api.auth.capabilities);
  const resetCapability = useQuery(api.passwordReset.capability);
  const embedded = isEmbedded();
  const autoStarted = useRef(false);
  const [mode, setMode] = useState<AuthMode>("signUp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode !== "signIn" && mode !== "signUp") return;
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      await signIn("password", {
        flow: mode,
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        ...(mode === "signUp" ? { name: String(data.get("name") ?? "").trim() } : {}),
      });
    } catch (reason) {
      const details = authErrorDetails(reason, mode === "signUp" ? "signUp" : "signIn");
      setError(details.description);
      notify({
        ...details,
        tone: "error",
        action: { label: "Reset password", onClick: () => switchMode("forgot") },
      });
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    if (authCapabilities?.google !== true) {
      setError("Google sign-in is not configured yet.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (embedded) {
        requestExternalGoogleSignIn();
        setNotice(
          "Click Google login in browser above this preview. On an older preview, use Open production, then Continue with Google. Finish sign-in and continue playing in that browser tab; this preview uses a separate session.",
        );
        return;
      }
      const pair = new URLSearchParams(location.search).get("pair") ?? "";
      const returnPath =
        currentPath() === "/device" && /^[A-HJ-NP-Z2-9]{8}$/.test(pair)
          ? `/device?pair=${pair}&authCallback=google`
          : "/?authCallback=google";
      await signIn("google", { redirectTo: returnPath });
    } catch (reason) {
      const details = authErrorDetails(reason, "google");
      setError(details.description);
      notify({ ...details, tone: "error" });
    } finally {
      setBusy(false);
    }
  }, [authCapabilities?.google, embedded, signIn, notify]);

  useEffect(() => {
    if (embedded || authCapabilities?.google === undefined || autoStarted.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth") !== "google") return;
    autoStarted.current = true;
    url.searchParams.delete("auth");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    void signInWithGoogle();
  }, [authCapabilities?.google, embedded, signInWithGoogle]);

  const submitResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetCapability?.enabled !== true) {
      setError("Password reset email is temporarily unavailable.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    try {
      await requestPasswordReset({ email });
      setResetEmail(email);
      setMode("reset");
      setNotice("If that account exists, an 8-digit reset code has been sent to its email.");
    } catch {
      setError("Could not contact the account service. Try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  const submitResetVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setBusy(false);
      setError("The new passwords do not match.");
      return;
    }
    try {
      await signIn("password", {
        flow: "reset-verification",
        email: String(data.get("email") ?? "")
          .trim()
          .toLowerCase(),
        code: String(data.get("code") ?? "").trim(),
        newPassword,
      });
    } catch {
      setError("The reset code is invalid or expired, or the new password does not meet policy.");
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    embedded,
    error,
    mode,
    notice,
    authCapabilities,
    resetCapability,
    resetEmail,
    signInWithGoogle,
    submitAccount,
    submitResetRequest,
    submitResetVerification,
    switchMode,
  };
}
