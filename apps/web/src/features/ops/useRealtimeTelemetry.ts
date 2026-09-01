import { useEffect, useState } from "react";
import { realtimeHealthUrl } from "../../shared/realtimeEndpoint";

interface HistogramSummary {
  count: number;
  p50: number;
  p95: number;
  max: number;
}

export interface RealtimeTelemetryPayload {
  ok: boolean;
  coordination: "distributed" | "local";
  releaseControl: "disabled" | "starting" | "ready" | "failed";
  blockedReleases: number;
  observability: {
    scope: "instance";
    uptimeMs: number;
    gauges: { rooms: number; connections: number; blockedReleases: number };
    counters: {
      releaseBlockedSessions: number;
      releaseDisconnectedConnections: number;
      browserSamples: number;
    };
    worker: { tickP95Ms: HistogramSummary };
    browser: { frameP95Ms: HistogramSummary; rttMs: HistogramSummary };
  };
}

export function useRealtimeTelemetry() {
  const [payload, setPayload] = useState<RealtimeTelemetryPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(realtimeHealthUrl, { cache: "no-store" });
        const next = (await response.json()) as RealtimeTelemetryPayload;
        if (!active) return;
        setPayload(next);
        setError(response.ok ? "" : "Realtime control plane is degraded");
      } catch {
        if (active) setError("Realtime telemetry is unavailable");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { payload, error };
}
