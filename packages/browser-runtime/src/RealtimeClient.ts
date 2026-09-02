import {
  type ClientMessage,
  type ServerMessage,
  type SnapshotMessage,
  serverMessageSchema,
} from "@play-together/contracts";
import {
  closeForRecovery,
  createRealtimeSocket,
  needsTicketRefresh,
  reconnectDelay,
  refreshConnectionTicket,
  ticketRefreshDelay,
} from "./realtimeConnection.js";
import { RealtimeHeartbeat } from "./realtimeHeartbeat.js";
import {
  CONNECT_TIMEOUT_MS,
  type ConnectionStatus,
  type ConnectionTicket,
  createInputMessage,
  type Listener,
  type RealtimeClientOptions,
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
  readonly #heartbeat: RealtimeHeartbeat;
  #socketTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: RealtimeClientOptions) {
    this.#options = options;
    this.#ticket = options.initialTicket;
    this.#heartbeat = new RealtimeHeartbeat(
      (message) => this.#send(message),
      options.telemetry,
      () => this.recover("heartbeat timeout"),
    );
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
  recover(reason = "client recovery"): void {
    if (this.#stopped || this.#connecting) return;
    const socket = this.#socket;
    this.#socket = null;
    this.#heartbeat.stop();
    this.#clearConnectionTimers();
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    closeForRecovery(socket, reason);
    this.#attempt = Math.max(1, this.#attempt + 1);
    this.#scheduleReconnect(true);
  }
  probe(): void {
    if (this.#status === "connected") this.#heartbeat.probe();
    else if (!this.#socket && !this.#connecting) this.#scheduleReconnect(true);
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
      if (needsTicketRefresh(this.#ticket, this.#attempt))
        this.#ticket = await refreshConnectionTicket(this.#options);
      if (this.#stopped) return;
      const socket = createRealtimeSocket(this.#options, this.#ticket);
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
        const refreshIn = ticketRefreshDelay(this.#ticket);
        this.#socketTimer = setTimeout(() => {
          if (this.#socket === socket) socket.close(4000, "refresh ticket");
        }, refreshIn);
      });

      socket.addEventListener("message", (event) => {
        if (this.#socket !== socket) return;
        try {
          const parsed = serverMessageSchema.parse(JSON.parse(String(event.data)));
          if (parsed.type === "welcome") {
            this.#heartbeat.start();
          } else if (parsed.type === "snapshot") {
            this.#latest = parsed;
            this.#subscriptions.emitSnapshot(parsed);
          } else if (parsed.type === "pong") {
            this.#heartbeat.pong(parsed.sentAt);
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
  #scheduleReconnect(immediate = false): void {
    if (this.#reconnectTimer || this.#stopped) return;
    this.#setStatus("reconnecting");
    const delay = reconnectDelay(this.#attempt, immediate);
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      void this.#connect();
    }, delay);
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
    this.#heartbeat.stop();
    if (this.#socketTimer) clearTimeout(this.#socketTimer);
    this.#socketTimer = null;
  }
  #clearTimers(): void {
    this.#clearConnectionTimers();
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }
}
