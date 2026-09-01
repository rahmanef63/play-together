import type { ClientMessage } from "@play-together/contracts";
import { createHeartbeatMessage, type RealtimeClientOptions } from "./realtimeProtocol.js";

const HEARTBEAT_INTERVAL_MS = 15_000;
const TELEMETRY_WARMUP_MS = 1_000;

type SendMessage = (message: ClientMessage) => void;

export class RealtimeHeartbeat {
  readonly #send: SendMessage;
  readonly #telemetry: RealtimeClientOptions["telemetry"];
  #interval: ReturnType<typeof setInterval> | null = null;
  #warmup: ReturnType<typeof setTimeout> | null = null;
  #roundTripMs: number | null = null;

  constructor(send: SendMessage, telemetry: RealtimeClientOptions["telemetry"]) {
    this.#send = send;
    this.#telemetry = telemetry;
  }

  start(): void {
    this.stop();
    this.#send(createHeartbeatMessage(this.#telemetry, null, false));
    this.#interval = setInterval(
      () => this.#send(createHeartbeatMessage(this.#telemetry, this.#roundTripMs)),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  pong(sentAt: number): void {
    const firstRoundTrip = this.#roundTripMs === null;
    this.#roundTripMs = Math.max(0, Math.min(60_000, Date.now() - sentAt));
    if (!firstRoundTrip || !this.#telemetry) return;
    this.#warmup = setTimeout(() => {
      this.#warmup = null;
      this.#send(createHeartbeatMessage(this.#telemetry, this.#roundTripMs));
    }, TELEMETRY_WARMUP_MS);
  }

  stop(): void {
    if (this.#interval) clearInterval(this.#interval);
    if (this.#warmup) clearTimeout(this.#warmup);
    this.#interval = null;
    this.#warmup = null;
    this.#roundTripMs = null;
  }
}
