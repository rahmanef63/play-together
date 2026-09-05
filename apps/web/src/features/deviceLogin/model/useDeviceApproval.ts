import { formatDeviceCode } from "@play-together/contracts";
import { useAction } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../shared/convexApi";
import { useToast } from "../../../shared/ToastProvider";
import { deviceReviewError, parsePairingInput } from "./pairingInput";

type Review = { code: string; label: string; expiresAt: number };
export function useDeviceApproval() {
  const inspect = useAction(api.deviceLogin.inspect),
    decide = useAction(api.deviceLogin.decide),
    notify = useToast();
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get("pair") ?? "");
  const [request, setRequest] = useState<Review | null>(null),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState<string | null>(null),
    [error, setError] = useState("");
  const revision = useRef(0);
  const update = (value: string) => {
    revision.current++;
    setCode(value);
    setRequest(null);
    setChecked(false);
    setBusy(false);
    setError("");
  };
  async function review(raw = code) {
    const turn = ++revision.current;
    setRequest(null);
    setChecked(false);
    setError("");
    const parsed = parsePairingInput(raw, location.origin);
    if (!parsed.code) {
      setError(parsed.error ?? "Enter the sign-in code from your other screen.");
      setBusy(false);
      return;
    }
    setCode(formatDeviceCode(parsed.code));
    setBusy(true);
    try {
      const result = await inspect({ code: parsed.code });
      if (turn !== revision.current) return;
      if (!result) {
        setError(
          "This code expired, was cancelled, or was already used. Keep the other screen open and create a new code there.",
        );
        return;
      }
      setRequest({ ...result, code: parsed.code });
    } catch (reason) {
      if (turn === revision.current) setError(deviceReviewError(reason));
    } finally {
      if (turn === revision.current) setBusy(false);
    }
  }
  async function respond(approve: boolean) {
    if (!request || (approve && !checked) || busy) return;
    const turn = revision.current;
    setBusy(true);
    setError("");
    try {
      await decide({ code: request.code, approve });
      if (turn !== revision.current) return;
      const title = approve ? "Device approved" : "Request declined";
      setDone(title);
      notify({
        title,
        description: approve
          ? "Return to your other screen to finish signing in."
          : "No access was granted.",
        tone: approve ? "success" : "info",
      });
    } catch (reason) {
      if (turn === revision.current) setError(deviceReviewError(reason));
    } finally {
      if (turn === revision.current) setBusy(false);
    }
  }
  return { code, update, review, respond, request, checked, setChecked, busy, done, error };
}
