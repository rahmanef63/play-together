import {
  type ClientMessage,
  type GameManifest,
  gameManifestSchema,
  type ServerMessage,
  type SnapshotMessage,
  serverMessageSchema,
} from "@play-together/contracts";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

type Listener<T> = (value: T) => void;

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", value));
}

export async function fetchVerifiedManifest(
  manifestUrl: string,
  expectedSha256: string,
): Promise<GameManifest> {
  const response = await fetch(manifestUrl, { cache: "no-store", credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Game manifest request failed (${response.status})`);
  }
  const bytes = await response.arrayBuffer();
  const actual = await sha256Hex(bytes);
  if (actual !== expectedSha256.toLowerCase()) {
    throw new Error("Game manifest integrity check failed");
  }
  return gameManifestSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
}

export async function importVerifiedModule<T>(
  moduleUrl: string,
  expectedSha256: string,
): Promise<T> {
  const response = await fetch(moduleUrl, { cache: "no-store", credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Game module request failed (${response.status})`);
  }
  const bytes = await response.arrayBuffer();
  const actual = await sha256Hex(bytes);
  if (actual !== expectedSha256.toLowerCase()) {
    throw new Error("Game module integrity check failed");
  }
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as T;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function resolveModuleUrl(manifestUrl: string, entryUrl: string): string {
  return new URL(entryUrl, manifestUrl).toString();
}

export interface ConnectionTicket {
  token: string;
  expiresAt: number;
}

export interface RealtimeClientOptions {
  baseUrl: string;
  initialTicket: ConnectionTicket;
  refreshTicket?: () => Promise<ConnectionTicket>;
  reconnect?: boolean;
  WebSocketImpl?: typeof WebSocket;
}

const BASE_PROTOCOL = "play-together.v1";
const TICKET_PROTOCOL_PREFIX = "ptt.";
const REFRESH_SKEW_MS = 15_000;

export class RealtimeClient {
  readonly #options: RealtimeClientOptions;
  readonly #snapshots = new Set<Listener<SnapshotMessage>>();
  readonly #messages = new Set<Listener<ServerMessage>>();
  readonly #statuses = new Set<Listener<ConnectionStatus>>();
  #socket: WebSocket | null = null;
  #latest: SnapshotMessage | null = null;
  #status: ConnectionStatus = "idle";
  #sequence = 0;
  #attempt = 0;
  #stopped = false;
  #connecting = false;
  #ticket: ConnectionTicket;
  #heartbeat: ReturnType<typeof setInterval> | null = null;
  #refreshTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.#send({
      type: "input",
      seq: this.#sequence++,
      sentAt: Date.now(),
      payload,
    });
  }

  subscribe(listener: Listener<SnapshotMessage>): () => void {
    this.#snapshots.add(listener);
    if (this.#latest) listener(this.#latest);
    return () => this.#snapshots.delete(listener);
  }

  onMessage(listener: Listener<ServerMessage>): () => void {
    this.#messages.add(listener);
    return () => this.#messages.delete(listener);
  }

  onStatus(listener: Listener<ConnectionStatus>): () => void {
    this.#statuses.add(listener);
    listener(this.#status);
    return () => this.#statuses.delete(listener);
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

      socket.addEventListener("open", () => {
        if (this.#socket !== socket) return;
        this.#attempt = 0;
        this.#setStatus("connected");
        this.#heartbeat = setInterval(() => {
          this.#send({ type: "heartbeat", sentAt: Date.now() });
        }, 15_000);
        const refreshIn = Math.max(1_000, this.#ticket.expiresAt - Date.now() - REFRESH_SKEW_MS);
        this.#refreshTimer = setTimeout(() => {
          if (this.#socket === socket) socket.close(4000, "refresh ticket");
        }, refreshIn);
      });

      socket.addEventListener("message", (event) => {
        try {
          const parsed = serverMessageSchema.parse(JSON.parse(String(event.data)));
          if (parsed.type === "snapshot") {
            this.#latest = parsed;
            for (const listener of this.#snapshots) listener(parsed);
          }
          for (const listener of this.#messages) listener(parsed);
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
    for (const listener of this.#statuses) listener(status);
  }

  #clearConnectionTimers(): void {
    if (this.#heartbeat) clearInterval(this.#heartbeat);
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    this.#heartbeat = null;
    this.#refreshTimer = null;
  }

  #clearTimers(): void {
    this.#clearConnectionTimers();
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }
}
