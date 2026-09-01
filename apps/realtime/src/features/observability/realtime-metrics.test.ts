import { describe, expect, it } from "vitest";
import { RealtimeMetrics } from "./realtime-metrics.js";

describe("RealtimeMetrics", () => {
  it("keeps bounded aggregate runtime telemetry without identifiers", () => {
    const metrics = new RealtimeMetrics();
    metrics.sessionStarted();
    metrics.workerPerformance({ ticks: 300, tickP50Ms: 2.3, tickP95Ms: 7.2, tickMaxMs: 18 });
    metrics.browserPerformance({ frameP95Ms: 24, frameMaxMs: 55, frameSamples: 180, rttMs: 81 });
    metrics.releaseBlock(2, 3);

    const snapshot = metrics.snapshot({ rooms: 2, connections: 3, blockedReleases: 1 });
    expect(snapshot.gauges).toEqual({ rooms: 2, connections: 3, blockedReleases: 1 });
    expect(snapshot.counters).toMatchObject({
      sessionsStarted: 1,
      browserSamples: 1,
      releaseBlockedSessions: 2,
      releaseDisconnectedConnections: 3,
    });
    expect(snapshot.worker.tickP95Ms.count).toBe(1);
    expect(snapshot.browser.rttMs.count).toBe(1);
    expect(JSON.stringify(snapshot)).not.toMatch(/roomId|playerId|gameId/);
  });
});
