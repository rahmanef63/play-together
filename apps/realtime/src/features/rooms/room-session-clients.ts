import { randomUUID } from "node:crypto";
import type { TicketClaims } from "@play-together/contracts";
import type { WebSocket } from "ws";
import { classifySocketPressure } from "./backpressure.js";

export interface ClientConnection {
  id: string;
  socket: WebSocket;
  claims: TicketClaims;
  connectedAt: number;
  messagesInWindow: number;
  lastSequence: number;
  lastTelemetryAt: number;
  windowStartedAt: number;
  expiryTimer: ReturnType<typeof setTimeout>;
}

export class RoomSessionClients {
  readonly #clients = new Map<string, ClientConnection>();

  get size(): number {
    return this.#clients.size;
  }

  add(socket: WebSocket, claims: TicketClaims): ClientConnection {
    const id = randomUUID();
    const connectedAt = Date.now();
    const expiresInMs = claims.exp * 1_000 - connectedAt;
    if (expiresInMs <= 0) throw new Error("Realtime ticket expired before connection");
    const expiryTimer = setTimeout(() => {
      const active = this.#clients.get(id);
      if (active) active.socket.close(4001, "ticket expired");
    }, expiresInMs);
    expiryTimer.unref();
    const connection: ClientConnection = {
      id,
      socket,
      claims,
      connectedAt,
      messagesInWindow: 0,
      lastSequence: -1,
      lastTelemetryAt: 0,
      windowStartedAt: connectedAt,
      expiryTimer,
    };
    this.#clients.set(id, connection);
    return connection;
  }

  get(id: string): ClientConnection | undefined {
    return this.#clients.get(id);
  }

  remove(id: string): ClientConnection | undefined {
    const connection = this.#clients.get(id);
    if (!connection) return undefined;
    this.#clients.delete(id);
    clearTimeout(connection.expiryTimer);
    return connection;
  }

  hasOtherController(playerId: string, exceptId?: string): boolean {
    return [...this.#clients.values()].some(
      (connection) =>
        connection.id !== exceptId &&
        connection.claims.role === "controller" &&
        connection.claims.sub === playerId,
    );
  }

  canRecordTelemetry(connection: ClientConnection, now = Date.now()): boolean {
    if (now - connection.lastTelemetryAt < 10_000) return false;
    connection.lastTelemetryAt = now;
    return true;
  }

  charge(connection: ClientConnection): boolean {
    const now = Date.now();
    if (now - connection.windowStartedAt >= 10_000) {
      connection.windowStartedAt = now;
      connection.messagesInWindow = 0;
    }
    connection.messagesInWindow += 1;
    return connection.messagesInWindow <= 700;
  }

  send(socket: WebSocket, message: unknown): void {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }

  broadcast(message: unknown, droppableSnapshot = false): void {
    const serialized = JSON.stringify(message);
    for (const connection of this.#clients.values()) {
      if (connection.socket.readyState !== connection.socket.OPEN) continue;
      const pressure = classifySocketPressure(connection.socket.bufferedAmount);
      if (pressure === "close") {
        connection.socket.close(1013, "client too slow");
        continue;
      }
      if (droppableSnapshot && pressure === "drop-snapshot") continue;
      connection.socket.send(serialized);
    }
  }

  broadcastPresence(): void {
    this.broadcast({
      type: "presence",
      players: [...this.#clients.values()].map((connection) => ({
        playerId: connection.claims.sub,
        role: connection.claims.role,
        mode: connection.claims.mode,
        connectedAt: connection.connectedAt,
      })),
    });
  }

  closeAll(code = 1012, reason = "room restarted"): number {
    const count = this.#clients.size;
    for (const connection of this.#clients.values()) {
      clearTimeout(connection.expiryTimer);
      connection.socket.close(code, reason);
    }
    this.#clients.clear();
    return count;
  }
}
