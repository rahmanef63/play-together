import { useAuthActions } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { authErrorMessage } from "../../../shared/authErrors";
import { api } from "../../../shared/convexApi";
import { useToast } from "../../../shared/ToastProvider";
import { deviceClientId, deviceLabel, proofDigest, randomDeviceProof } from "./deviceProof";

type Challenge = import("convex/server").FunctionReturnType<typeof api.deviceLogin.start>;
export function useDeviceLogin() {
  const start = useAction(api.deviceLogin.start),
    status = useAction(api.deviceLogin.status),
    cancel = useAction(api.deviceLogin.cancel);
  const { signIn } = useAuthActions();
  const notify = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null),
    [phase, setPhase] = useState("idle"),
    [error, setError] = useState("");
  const secret = useRef(""),
    generation = useRef(0),
    current = useRef<Challenge | null>(null),
    mounted = useRef(true);
  const generate = useCallback(async () => {
    const turn = ++generation.current;
    if (current.current && secret.current)
      void cancel({ id: current.current.id, proof: secret.current }).catch(() => undefined);
    current.current = null;
    setChallenge(null);
    setPhase("creating");
    setError("");
    try {
      const proof = randomDeviceProof();
      secret.current = proof;
      const next = await start({
        proofHash: await proofDigest(proof),
        clientId: deviceClientId(),
        label: deviceLabel(),
      });
      if (!mounted.current || turn !== generation.current) {
        void cancel({ id: next.id, proof }).catch(() => undefined);
        return;
      }
      current.current = next;
      setChallenge(next);
      setPhase("pending");
    } catch (reason) {
      if (mounted.current) {
        setPhase("error");
        setError(authErrorMessage(reason));
      }
    }
  }, [start, cancel]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      if (current.current && secret.current)
        void cancel({ id: current.current.id, proof: secret.current }).catch(() => undefined);
      secret.current = "";
    };
  }, [cancel]);
  useEffect(() => {
    if (!challenge || phase !== "pending") return;
    let stopped = false,
      timer = 0;
    const poll = async () => {
      if (stopped) return;
      if (Date.now() >= challenge.expiresAt) {
        setPhase("expired");
        return;
      }
      try {
        const result = await status({ id: challenge.id, proof: secret.current });
        if (stopped) return;
        if (result.state === "approved") {
          // Do not change the effect dependency until the one-time exchange settles.
          const result = await signIn("device-qr", { id: challenge.id, proof: secret.current });
          if (result.signingIn) {
            notify({
              title: "Device connected",
              description: "You are signed in on this screen.",
              tone: "success",
            });
          } else if (!stopped) setPhase("expired");
          return;
        }
        if (!["pending", "slow_down"].includes(result.state)) {
          setPhase(result.state);
          return;
        }
      } catch (reason) {
        if (!stopped) {
          setError(authErrorMessage(reason));
          setPhase("error");
        }
        return;
      }
      if (!stopped) timer = window.setTimeout(poll, challenge.intervalMs);
    };
    timer = window.setTimeout(poll, challenge.intervalMs);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [challenge, phase, status, signIn, notify]);
  return { challenge, phase, error, generate };
}
