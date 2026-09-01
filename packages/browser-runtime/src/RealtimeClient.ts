import {
  type ClientMessage,
  type ServerMessage,
  type SnapshotMessage,
  serverMessageSchema,
} from "@play-together/contracts";
import {
  BASE_PROTOCOL,
  CONNECT_TIMEOUT_MS,
  type ConnectionStatus,
  type ConnectionTicket,
  createInputMessage,
  type Listener,
  REFRESH_SKEW_MS,
  type RealtimeClientOptions,
  TICKET_PROTOCOL_PREFIX,
} from "./realtimeProtocol.js";
import { RealtimeSubscriptions } from "./realtimeSubscriptions.js";

export class RealtimeClient {
  readonly #options: RealtimeClientOptions;
  readonly #subscriptions = new RealtimeSubscriptions();
  #socket: WebSocket | null = null;
  #latest: SnapshotMessage | null = null;
  #status: ConnectionStatus = "idle";
  #sequence = 0;
  #attempt = 0;
  #stopped = false;
  #connecting = false;
  #ticket: ConnectionTicket;
  #heartbeat: ReturnType<typeof setInterval> | null = null;
  #socketTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #roundTripMs: number | null = null;

  constructor(options: RealtimeClientOptions) {
    this.#options = options;
    this.#ticket = options.initialTicket;
  }

  get status(): ConnectionStatus {
    return this.#status;
  }
  get latestSnapshot(): SnapshotMessage | null {
    return this.#latest;
  }

  start(): void {
    if (this.#socket || this.#connecting || this.#stopped) return;
    void this.#connect();
  }

  stop(): void {
    this.#stopped = true;
    this.#clearTimers();
    this.#setStatus("closed");
    this.#socket?.close(1000, "client closed");
    this.#socket = null;
  }

  sendInput(payload: unknown): void {
    this.#send(createInputMessage(this.#sequence++, payload));
  }

  subscribe(listener: Listener<SnapshotMessage>): () => void {
    return this.#subscriptions.snapshot(listener, this.#latest);
  }

  onMessage(listener: Listener<ServerMessage>): () => void {
    return this.#subscriptions.message(listener);
  }

  onStatus(listener: Listener<ConnectionStatus>): () => void {
    return this.#subscriptions.status(listener, this.#status);
  }

  async #connect(): Promise<void> {
    if (this.#connecting || this.#socket || this.#stopped) return;
    this.#connecting = true;
    this.#setStatus(this.#attempt === 0 ? "connecting" : "reconnecting");
    try {
      if (this.#attempt > 0 || this.#ticket.expiresAt <= Date.now() + REFRESH_SKEW_MS) {
        if (!this.#options.refreshTicket) throw new Error("Realtime ticket expired");
        this.#ticket = await this.#options.refreshTicket();
      }
      if (this.#stopped) return;
      const WebSocketConstructor = this.#options.WebSocketImpl ?? WebSocket;
      const endpoint = new URL(this.#options.baseUrl);
      endpoint.searchParams.delete("ticket");
      const socket = new WebSocketConstructor(endpoint.toString(), [
        BASE_PROTOCOL,
        `${TICKET_PROTOCOL_PREFIX}${this.#ticket.token}`,
      ]);
      this.#socket = socket;
      this.#socketTimer = setTimeout(() => {
        if (this.#socket !== socket || this.#stopped) return;
        this.#socket = null;
        this.#socketTimer = null;
        socket.close(4001, "connect timeout");
        this.#attempt += 1;
        this.#scheduleReconnect();
      }, CONNECT_TIMEOUT_MS);

      socket.addEventListener("open", () => {
        if (this.#socket !== socket) return;
        if (this.#socketTimer) clearTimeout(this.#socketTimer);
        this.#socketTimer = null;
        this.#attempt = 0;
        this.#setStatus("connected");
        this.#heartbeat = setInterval(() => {
          const telemetry = this.#options.telemetry?.(this.#roundTripMs);
          this.#send({
            type: "heartbeat",
            sentAt: Date.now(),
            ...(telemetry ? { telemetry } : {}),
          });
        }, 15_000);
        const refreshIn = Math.max(1_000, this.#ticket.expiresAt - Date.now() - REFRESH_SKEW_MS);
        this.#socketTimer = setTimeout(() => {
          if (this.#socket === socket) socket.close(4000, "refresh ticket");
        }, refreshIn);
      });

      socket.addEventListener("message", (event) => {
        try {
          const parsed = serverMessageSchema.parse(JSON.parse(String(event.data)));
          if (parsed.type === "snapshot") {
            this.#latest = parsed;
            this.#subscriptions.emitSnapshot(parsed);
          } else if (parsed.type === "pong") {
            this.#roundTripMs = Math.max(0, Math.min(60_000, Date.now() - parsed.sentAt));
          }
          this.#subscriptions.emitMessage(parsed);
        } catch {
          // Invalid server data is ignored; it must never reach a game bundle.
        }
      });

      socket.addEventListener("close", () => {
        if (this.#socket !== socket) return;
        this.#socket = null;
        this.#clearConnectionTimers();
        if (this.#stopped || this.#options.reconnect === false) {
          this.#setStatus("closed");
          return;
        }
        this.#attempt += 1;
        this.#scheduleReconnect();
      });
    } catch {
      if (!this.#stopped && this.#options.reconnect !== false) {
        this.#attempt += 1;
        this.#scheduleReconnect();
      } else {
        this.#setStatus("closed");
      }
    } finally {
      this.#connecting = false;
    }
  }

  #scheduleReconnect(): void {
    if (this.#reconnectTimer || this.#stopped) return;
    this.#setStatus("reconnecting");
    const delay = Math.min(10_000, 300 * 2 ** Math.min(this.#attempt, 5));
    this.#reconnectTimer = setTimeout(
      () => {
        this.#reconnectTimer = null;
        void this.#connect();
      },
      delay + Math.random() * 250,
    );
  }

  #send(message: ClientMessage): void {
    if (this.#socket?.readyState !== WebSocket.OPEN) return;
    this.#socket.send(JSON.stringify(message));
  }

  #setStatus(status: ConnectionStatus): void {
    if (status === this.#status) return;
    this.#status = status;
    this.#subscriptions.emitStatus(status);
  }

  #clearConnectionTimers(): void {
    if (this.#heartbeat) clearInterval(this.#heartbeat);
    if (this.#socketTimer) clearTimeout(this.#socketTimer);
    this.#heartbeat = null;
    this.#socketTimer = null;
  }

  #clearTimers(): void {
    this.#clearConnectionTimers();
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }
}
