import { useRealtimeTelemetry } from "./useRealtimeTelemetry";

export function RealtimeTelemetryPanel() {
  const { payload, error } = useRealtimeTelemetry();
  const metrics = payload?.observability;
  const healthy = payload?.ok && payload.releaseControl !== "failed";

  return (
    <section
      className="panel panel-frame ops-telemetry-panel"
      aria-labelledby="ops-telemetry-title"
    >
      <div className="ops-telemetry-header">
        <div>
          <span className="ops-console-label">Realtime observability</span>
          <h2 id="ops-telemetry-title">Live instance sample</h2>
        </div>
        <span className={`ops-telemetry-status ${healthy ? "is-ready" : "is-pending"}`}>
          {payload ? `${payload.coordination} · ${payload.releaseControl}` : "connecting"}
        </span>
      </div>
      {error ? <p className="ops-telemetry-error">{error}</p> : null}
      <div className="ops-telemetry-grid">
        <Metric label="Rooms" value={metrics ? String(metrics.gauges.rooms) : "—"} />
        <Metric label="Connections" value={metrics ? String(metrics.gauges.connections) : "—"} />
        <Metric label="Worker tick p95" value={formatP95(metrics?.worker.tickP95Ms)} />
        <Metric label="Frame p95" value={formatP95(metrics?.browser.frameP95Ms)} />
        <Metric label="WebSocket RTT p95" value={formatP95(metrics?.browser.rttMs)} />
        <Metric
          label="Revoked connections"
          value={metrics ? String(metrics.counters.releaseDisconnectedConnections) : "—"}
        />
      </div>
      <p className="ops-telemetry-note">
        Fixed-cardinality telemetry for this active realtime instance. No player, room, or game IDs
        are recorded.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ops-telemetry-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatP95(summary: { count: number; p95: number } | undefined): string {
  return summary && summary.count > 0 ? `${summary.p95} ms` : "—";
}
