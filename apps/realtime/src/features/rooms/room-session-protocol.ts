import type { ClientMessage } from "@play-together/contracts";
import type { RealtimeMetrics } from "../observability/realtime-metrics.js";
import type { RoomGameWorker } from "./room-game-worker.js";
import type { RoomSessionClients } from "./room-session-clients.js";
import type { RoomSessionDistribution } from "./room-session-distribution.js";

export class RoomSessionProtocol {
  readonly #worker: RoomGameWorker;
  readonly #clients: RoomSessionClients;
  readonly #distribution: RoomSessionDistribution;
  readonly #metrics: RealtimeMetrics;

  constructor(
    worker: RoomGameWorker,
    clients: RoomSessionClients,
    distribution: RoomSessionDistribution,
    metrics: RealtimeMetrics,
  ) {
    this.#worker = worker;
    this.#clients = clients;
    this.#distribution = distribution;
    this.#metrics = metrics;
  }

  handle(connectionId: string, message: ClientMessage): void {
    const connection = this.#clients.get(connectionId);
    if (!connection) return;
    if (!this.#clients.charge(connection)) {
      this.#clients.send(connection.socket, {
        type: "error",
        code: "RATE_LIMIT",
        message: "Input rate exceeded",
        fatal: true,
      });
      connection.socket.close(1008, "rate limit");
      return;
    }
    if (message.type === "heartbeat") {
      if (
        message.telemetry &&
        (connection.claims.role === "display" || connection.claims.mode === "handheld") &&
        this.#clients.canRecordTelemetry(connection)
      )
        this.#metrics.browserPerformance(message.telemetry);
      this.#clients.send(connection.socket, {
        type: "pong",
        sentAt: message.sentAt,
        serverTime: Date.now(),
      });
      this.#distribution.heartbeat(connectionId);
      return;
    }
    if (connection.claims.role !== "controller") return;
    const sequence = message.seq;
    if (sequence <= connection.lastSequence) return;
    connection.lastSequence = sequence;
    if (
      !this.#distribution.publishInput({
        playerId: connection.claims.sub,
        connectedAt: connection.connectedAt,
        payload: message.payload,
        sequence,
      })
    )
      this.#worker.input(connection.claims.sub, message.payload, sequence);
  }
}
