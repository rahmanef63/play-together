import type { ClientMessage, TicketClaims } from "@play-together/contracts";
import type { WebSocket } from "ws";
import type { ResolvedGameModule } from "../modules/module-store.js";
import type { RealtimeMetrics } from "../observability/realtime-metrics.js";
import { RELEASE_BLOCK_RESPONSE } from "../releases/release-block-response.js";
import type {
  CoordinatedInput,
  CoordinatedPresencePlayer,
  CoordinatedSnapshot,
  RoomCoordinatorHandle,
} from "./room-coordinator.js";
import { RoomGameWorker } from "./room-game-worker.js";
import { RoomSessionClients } from "./room-session-clients.js";
import { RoomSessionDistribution } from "./room-session-distribution.js";
import { RoomSessionProtocol } from "./room-session-protocol.js";

export class RoomSession {
  readonly key: string;
  readonly #worker: RoomGameWorker;
  readonly #clients = new RoomSessionClients();
  readonly #onEmpty: () => void;
  #closed = false;
  readonly #distribution: RoomSessionDistribution;
  readonly #protocol: RoomSessionProtocol;

  constructor(
    claims: TicketClaims,
    module: ResolvedGameModule,
    onEmpty: () => void,
    metrics: RealtimeMetrics,
    workerScriptPath?: string,
  ) {
    this.#onEmpty = onEmpty;
    this.key = `${claims.roomId}:${claims.gameId}@${claims.gameVersion}:${claims.manifestSha256}`;
    this.#worker = new RoomGameWorker(
      claims,
      module,
      {
        onSnapshot: (snapshot) => this.#onSnapshot(snapshot),
        onGameError: (message, fatal) => {
          this.#clients.broadcast({ type: "error", code: "GAME_ERROR", message, fatal });
          if (fatal) this.close();
        },
        onFatal: (code, message) => {
          this.#clients.broadcast({ type: "error", code, message, fatal: true }, false);
          this.close();
        },
      },
      metrics,
      workerScriptPath,
    );
    this.#distribution = new RoomSessionDistribution(this.#worker, this.#clients, (reason) => {
      metrics.coordinationFailure();
      this.#coordinationFailed(reason);
    });
    this.#protocol = new RoomSessionProtocol(
      this.#worker,
      this.#clients,
      this.#distribution,
      metrics,
    );
  }

  get size(): number {
    return this.#clients.size;
  }

  attachCoordinator(coordinator: RoomCoordinatorHandle): void {
    this.#distribution.attach(coordinator);
  }

  syncDistributedPresence(players: CoordinatedPresencePlayer[]): void {
    if (!this.#closed) this.#distribution.syncPresence(players);
  }

  handleDistributedInput(input: CoordinatedInput): void {
    if (!this.#closed) this.#distribution.handleInput(input);
  }

  handleDistributedSnapshot(snapshot: CoordinatedSnapshot): void {
    if (!this.#closed) this.#distribution.handleSnapshot(snapshot);
  }

  async add(socket: WebSocket, claims: TicketClaims): Promise<string> {
    await this.#worker.ready;
    if (this.#closed) throw new Error("Room session is closed");
    const connection = this.#clients.add(socket, claims);
    const distributed = await this.#distribution.register(connection.id, {
      playerId: claims.sub,
      role: claims.role,
      mode: claims.mode,
      connectedAt: connection.connectedAt,
    });
    if (
      !distributed &&
      claims.role === "controller" &&
      !this.#clients.hasOtherController(claims.sub, connection.id)
    ) {
      this.#worker.join(claims.sub, connection.connectedAt);
    }
    this.#clients.send(socket, {
      type: "welcome",
      connectionId: connection.id,
      playerId: claims.sub,
      roomId: claims.roomId,
      roomCode: claims.roomCode,
      role: claims.role,
      mode: claims.mode,
      gameId: claims.gameId,
      gameVersion: claims.gameVersion,
      protocolVersion: 1,
    });
    if (!this.#distribution.active) this.#clients.broadcastPresence();
    return connection.id;
  }

  handle(connectionId: string, message: ClientMessage): void {
    if (!this.#closed) this.#protocol.handle(connectionId, message);
  }

  remove(connectionId: string): void {
    const connection = this.#clients.remove(connectionId);
    if (!connection) return;
    if (!this.#distribution.unregister(connectionId)) {
      if (
        connection.claims.role === "controller" &&
        !this.#clients.hasOtherController(connection.claims.sub)
      )
        this.#worker.leave(connection.claims.sub);
      this.#clients.broadcastPresence();
    }
    if (this.#clients.size === 0) this.#onEmpty();
  }

  blockRelease(): number {
    if (this.#closed) return 0;
    this.#clients.broadcast(RELEASE_BLOCK_RESPONSE.message);
    return this.close(RELEASE_BLOCK_RESPONSE.closeCode, RELEASE_BLOCK_RESPONSE.closeReason);
  }

  close(code = 1012, reason = "room restarted"): number {
    if (this.#closed) return 0;
    this.#closed = true;
    const disconnected = this.#clients.closeAll(code, reason);
    this.#distribution.close();
    this.#worker.dispose();
    return disconnected;
  }

  #onSnapshot(snapshot: CoordinatedSnapshot): void {
    if (!this.#distribution.publishSnapshot(snapshot)) {
      this.#clients.broadcast({ type: "snapshot", ...snapshot }, true);
    }
  }

  #coordinationFailed(reason: unknown): void {
    if (this.#closed) return;
    this.#clients.broadcast({
      type: "error",
      code: "COORDINATION_UNAVAILABLE",
      message: reason instanceof Error ? reason.message : "Shared room coordination is unavailable",
      fatal: true,
    });
    this.close();
  }
}
