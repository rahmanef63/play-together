import type { RuntimeTelemetry } from "@play-together/contracts";
import { FixedHistogram } from "./fixed-histogram.js";

export const WORKER_TICK_MS_BOUNDS = [1, 2, 4, 8, 12, 16, 25, 33, 50, 100, 250, 500] as const;
const FRAME_MS_BOUNDS = [16, 20, 25, 33, 50, 75, 100, 250, 500, 1_000] as const;
const RTT_MS_BOUNDS = [20, 40, 80, 120, 200, 350, 500, 1_000, 2_000, 5_000] as const;

export interface WorkerPerformanceSample {
  ticks: number;
  tickP50Ms: number;
  tickP95Ms: number;
  tickMaxMs: number;
}

export class RealtimeMetrics {
  readonly #startedAt = Date.now();
  readonly #workerP50 = new FixedHistogram(WORKER_TICK_MS_BOUNDS);
  readonly #workerP95 = new FixedHistogram(WORKER_TICK_MS_BOUNDS);
  readonly #workerMax = new FixedHistogram(WORKER_TICK_MS_BOUNDS);
  readonly #frameP95 = new FixedHistogram(FRAME_MS_BOUNDS);
  readonly #frameMax = new FixedHistogram(FRAME_MS_BOUNDS);
  readonly #rtt = new FixedHistogram(RTT_MS_BOUNDS);
  readonly #counters = {
    sessionsStarted: 0,
    sessionsClosed: 0,
    snapshotsGenerated: 0,
    gameErrors: 0,
    workerFatals: 0,
    coordinationFailures: 0,
    releaseBlockEvents: 0,
    releaseBlockedSessions: 0,
    releaseDisconnectedConnections: 0,
    browserSamples: 0,
  };

  sessionStarted(): void {
    this.#counters.sessionsStarted += 1;
  }
  sessionClosed(): void {
    this.#counters.sessionsClosed += 1;
  }
  snapshotGenerated(): void {
    this.#counters.snapshotsGenerated += 1;
  }
  gameError(): void {
    this.#counters.gameErrors += 1;
  }
  workerFatal(): void {
    this.#counters.workerFatals += 1;
  }
  coordinationFailure(): void {
    this.#counters.coordinationFailures += 1;
  }

  releaseBlock(sessions: number, connections: number): void {
    this.#counters.releaseBlockEvents += 1;
    this.#counters.releaseBlockedSessions += sessions;
    this.#counters.releaseDisconnectedConnections += connections;
  }

  workerPerformance(sample: WorkerPerformanceSample): void {
    if (sample.ticks <= 0) return;
    this.#workerP50.observe(sample.tickP50Ms);
    this.#workerP95.observe(sample.tickP95Ms);
    this.#workerMax.observe(sample.tickMaxMs);
  }

  browserPerformance(sample: RuntimeTelemetry): void {
    this.#counters.browserSamples += 1;
    this.#frameP95.observe(sample.frameP95Ms);
    this.#frameMax.observe(sample.frameMaxMs);
    if (sample.rttMs !== undefined) this.#rtt.observe(sample.rttMs);
  }

  snapshot(gauges: { rooms: number; connections: number; blockedReleases: number }) {
    return {
      schemaVersion: 1,
      scope: "instance",
      since: this.#startedAt,
      uptimeMs: Date.now() - this.#startedAt,
      gauges,
      counters: { ...this.#counters },
      worker: {
        tickP50Ms: this.#workerP50.summary(),
        tickP95Ms: this.#workerP95.summary(),
        tickMaxMs: this.#workerMax.summary(),
      },
      browser: {
        frameP95Ms: this.#frameP95.summary(),
        frameMaxMs: this.#frameMax.summary(),
        rttMs: this.#rtt.summary(),
      },
    };
  }
}
