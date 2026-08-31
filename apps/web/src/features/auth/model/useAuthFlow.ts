import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "../../../shared/convexApi";
import { authErrorMessage } from "../../../shared/errors";

export type AuthMode = "signIn" | "signUp" | "forgot" | "reset";

export function useAuthFlow() {
  const { signIn } = useAuthActions();
  const requestPasswordReset = useAction(api.passwordReset.request);
  const resetCapability = useQuery(api.passwordReset.capability);
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
      setError(authErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

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
    error,
    mode,
    notice,
    resetCapability,
    resetEmail,
    submitAccount,
    submitResetRequest,
    submitResetVerification,
    switchMode,
  };
}
