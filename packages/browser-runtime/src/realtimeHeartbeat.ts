import type { ClientMessage } from "@play-together/contracts";
import { createHeartbeatMessage, type RealtimeClientOptions } from "./realtimeProtocol.js";

export const HEARTBEAT_INTERVAL_MS = 10_000;
export const HEARTBEAT_PONG_TIMEOUT_MS = 12_000;
const TELEMETRY_WARMUP_MS = 1_000;

type SendMessage = (message: ClientMessage) => void;

export class RealtimeHeartbeat {
  readonly #send: SendMessage;
  readonly #telemetry: RealtimeClientOptions["telemetry"];
  readonly #onStale: () => void;
  #interval: ReturnType<typeof setInterval> | null = null;
  #warmup: ReturnType<typeof setTimeout> | null = null;
  #staleTimer: ReturnType<typeof setTimeout> | null = null;
  #roundTripMs: number | null = null;
  #pendingSentAt: number | null = null;

  constructor(
    send: SendMessage,
    telemetry: RealtimeClientOptions["telemetry"],
    onStale: () => void,
  ) {
    this.#send = send;
    this.#telemetry = telemetry;
    this.#onStale = onStale;
  }

  start(): void {
    this.stop();
    this.#ping(false);
    this.#interval = setInterval(() => this.#ping(true), HEARTBEAT_INTERVAL_MS);
  }

  pong(sentAt: number): void {
    if (this.#pendingSentAt !== null && sentAt !== this.#pendingSentAt) return;
    const firstRoundTrip = this.#roundTripMs === null;
    this.#roundTripMs = Math.max(0, Math.min(60_000, Date.now() - sentAt));
    this.#pendingSentAt = null;
    if (this.#staleTimer) clearTimeout(this.#staleTimer);
    this.#staleTimer = null;
    if (!firstRoundTrip || !this.#telemetry) return;
    this.#warmup = setTimeout(() => {
      this.#warmup = null;
      this.#send(createHeartbeatMessage(this.#telemetry, this.#roundTripMs));
    }, TELEMETRY_WARMUP_MS);
  }

  probe(): void {
    if (this.#interval && this.#pendingSentAt === null) this.#ping(false);
  }

  stop(): void {
    if (this.#interval) clearInterval(this.#interval);
    if (this.#warmup) clearTimeout(this.#warmup);
    if (this.#staleTimer) clearTimeout(this.#staleTimer);
    this.#interval = null;
    this.#warmup = null;
    this.#staleTimer = null;
    this.#pendingSentAt = null;
    this.#roundTripMs = null;
  }

  #ping(includeTelemetry: boolean): void {
    if (this.#pendingSentAt !== null) return;
    const message = createHeartbeatMessage(this.#telemetry, this.#roundTripMs, includeTelemetry);
    this.#pendingSentAt = message.sentAt;
    this.#send(message);
    this.#staleTimer = setTimeout(() => {
      this.#staleTimer = null;
      if (this.#pendingSentAt === null) return;
      this.#pendingSentAt = null;
      this.#onStale();
    }, HEARTBEAT_PONG_TIMEOUT_MS);
  }
}
