import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { TicketClaims } from "@play-together/contracts";
import type { WebSocket } from "ws";
import type { ResolvedGameModule } from "../modules/module-store.js";
import { classifySocketPressure } from "./backpressure.js";
import {
  authorityInstanceId,
  type CoordinatedInput,
  type CoordinatedPresencePlayer,
  type CoordinatedSnapshot,
  type RoomCoordinatorHandle,
} from "./room-coordinator.js";

interface ClientConnection {
  id: string;
  socket: WebSocket;
  claims: TicketClaims;
  connectedAt: number;
  messagesInWindow: number;
  lastSequence: number;
  windowStartedAt: number;
  expiryTimer: ReturnType<typeof setTimeout>;
}

const WORKER_READY_TIMEOUT_MS = 8_000;

interface WorkerMessage {
  type: "ready" | "snapshot" | "error" | "disposed";
  tick?: number;
  serverTime?: number;
  state?: unknown;
  message?: string;
  fatal?: boolean;
}

export class RoomSession {
  readonly key: string;
  readonly #worker: Worker;
  readonly #clients = new Map<string, ClientConnection>();
  readonly #onEmpty: () => void;
  #ready: Promise<void>;
  #resolveReady!: () => void;
  #rejectReady!: (error: Error) => void;
  #closed = false;
  #readyTimer: ReturnType<typeof setTimeout> | null = null;
  #coordinator: RoomCoordinatorHandle | null = null;
  #coordinatedControllers = new Map<string, number>();
  #isCoordinatorAuthority = false;

  constructor(
    claims: TicketClaims,
    module: ResolvedGameModule,
    onEmpty: () => void,
    workerScriptPath?: string,
  ) {
    this.#onEmpty = onEmpty;
    this.key = `${claims.roomId}:${claims.gameId}@${claims.gameVersion}:${claims.manifestSha256}`;
    this.#ready = new Promise((resolve, reject) => {
      this.#resolveReady = resolve;
      this.#rejectReady = reject;
    });
    this.#readyTimer = setTimeout(() => {
      const error = new Error("Game worker did not become ready in time");
      this.#rejectReady(error);
      this.#broadcast(
        {
          type: "error",
          code: "GAME_WORKER_TIMEOUT",
          message: "This room's game process did not start in time",
          fatal: true,
        },
        false,
      );
      this.close();
    }, WORKER_READY_TIMEOUT_MS);
    this.#readyTimer.unref();

    const workerUrl = workerScriptPath
      ? pathToFileURL(workerScriptPath)
      : new URL("./game-worker.js", import.meta.url);
    this.#worker = new Worker(workerUrl, {
      workerData: {
        modulePath: module.modulePath,
        context: {
          roomId: claims.roomId,
          gameId: claims.gameId,
          gameVersion: claims.gameVersion,
          seed: stableSeed(claims.roomId),
        },
        tickRate: module.manifest.game.tickRate,
        snapshotRate: module.manifest.game.snapshotRate,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      },
    });
    this.#worker.on("message", (message: WorkerMessage) => this.#onWorkerMessage(message));
    this.#worker.on("error", (error) => {
      this.#clearReadyTimer();
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.#rejectReady(normalized);
      this.#broadcast({
        type: "error",
        code: "GAME_WORKER_CRASH",
        message: "This room's game process stopped",
        fatal: true,
      });
      this.close();
    });
    this.#worker.on("exit", (code) => {
      this.#clearReadyTimer();
      if (!this.#closed && code !== 0) {
        this.#broadcast({
          type: "error",
          code: "GAME_WORKER_EXIT",
          message: "This room's game process exited",
          fatal: true,
        });
        this.close();
      }
    });
  }

  get size(): number {
    return this.#clients.size;
  }

  attachCoordinator(coordinator: RoomCoordinatorHandle): void {
    if (this.#coordinator) throw new Error("Room coordinator is already attached");
    this.#coordinator = coordinator;
  }

  syncDistributedPresence(players: CoordinatedPresencePlayer[]): void {
    if (!this.#coordinator || this.#closed) return;
    this.#isCoordinatorAuthority = authorityInstanceId(players) === this.#coordinator.instanceId;

    const nextControllers = new Map<string, number>();
    for (const player of players) {
      if (player.role !== "controller") continue;
      const current = nextControllers.get(player.playerId);
      if (current === undefined || player.connectedAt < current) {
        nextControllers.set(player.playerId, player.connectedAt);
      }
    }
    for (const [playerId, connectedAt] of nextControllers) {
      if (!this.#coordinatedControllers.has(playerId)) {
        this.#worker.postMessage({ type: "join", playerId, connectedAt });
      }
    }
    for (const playerId of this.#coordinatedControllers.keys()) {
      if (!nextControllers.has(playerId)) this.#worker.postMessage({ type: "leave", playerId });
    }
    this.#coordinatedControllers = nextControllers;
    this.#broadcast({
      type: "presence",
      players: players.map((player) => ({
        playerId: player.playerId,
        role: player.role,
        mode: player.mode,
        connectedAt: player.connectedAt,
      })),
    });
  }

  handleDistributedInput(input: CoordinatedInput): void {
    if (!this.#coordinator || this.#closed) return;
    if (!this.#coordinatedControllers.has(input.playerId)) {
      this.#coordinatedControllers.set(input.playerId, input.connectedAt);
      this.#worker.postMessage({
        type: "join",
        playerId: input.playerId,
        connectedAt: input.connectedAt,
      });
    }
    this.#worker.postMessage({
      type: "input",
      playerId: input.playerId,
      payload: input.payload,
      sequence: input.sequence,
    });
  }

  handleDistributedSnapshot(snapshot: CoordinatedSnapshot): void {
    if (!this.#coordinator || this.#closed) return;
    this.#broadcast({ type: "snapshot", ...snapshot }, true);
  }

  async add(socket: WebSocket, claims: TicketClaims): Promise<string> {
    await this.#ready;
    if (this.#closed) throw new Error("Room session is closed");
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
      windowStartedAt: connectedAt,
      expiryTimer,
    };
    this.#clients.set(id, connection);
    if (this.#coordinator) {
      await this.#coordinator.register({
        connectionId: id,
        playerId: claims.sub,
        role: claims.role,
        mode: claims.mode,
        connectedAt,
      });
    } else if (claims.role === "controller" && !this.#hasOtherController(claims.sub, id)) {
      this.#worker.postMessage({ type: "join", playerId: claims.sub, connectedAt });
    }
    this.#send(socket, {
      type: "welcome",
      connectionId: id,
      playerId: claims.sub,
      roomId: claims.roomId,
      roomCode: claims.roomCode,
      role: claims.role,
      mode: claims.mode,
      gameId: claims.gameId,
      gameVersion: claims.gameVersion,
      protocolVersion: 1,
    });
    if (!this.#coordinator) this.#broadcastPresence();
    return id;
  }

  handle(connectionId: string, message: { type: string; [key: string]: unknown }): void {
    const connection = this.#clients.get(connectionId);
    if (!connection || this.#closed) return;
    if (!this.#charge(connection)) {
      this.#send(connection.socket, {
        type: "error",
        code: "RATE_LIMIT",
        message: "Input rate exceeded",
        fatal: true,
      });
      connection.socket.close(1008, "rate limit");
      return;
    }
    if (message.type === "heartbeat") {
      this.#send(connection.socket, {
        type: "pong",
        sentAt: Number(message.sentAt) || 0,
        serverTime: Date.now(),
      });
      if (this.#coordinator) {
        void this.#coordinator
          .heartbeat(connectionId)
          .catch((error) => this.#coordinationFailed(error));
      }
      return;
    }
    if (message.type === "input" && connection.claims.role === "controller") {
      const sequence = Number(message.seq);
      if (!Number.isInteger(sequence) || sequence <= connection.lastSequence) return;
      connection.lastSequence = sequence;
      if (this.#coordinator) {
        void this.#coordinator
          .publishInput({
            playerId: connection.claims.sub,
            connectedAt: connection.connectedAt,
            payload: message.payload,
            sequence,
          })
          .catch((error) => this.#coordinationFailed(error));
      } else {
        this.#worker.postMessage({
          type: "input",
          playerId: connection.claims.sub,
          payload: message.payload,
          sequence,
        });
      }
    }
  }

  remove(connectionId: string): void {
    const connection = this.#clients.get(connectionId);
    if (!connection) return;
    this.#clients.delete(connectionId);
    clearTimeout(connection.expiryTimer);
    if (this.#coordinator) {
      void this.#coordinator
        .unregister(connectionId)
        .catch((error) => this.#coordinationFailed(error));
    } else {
      if (
        connection.claims.role === "controller" &&
        !this.#hasOtherController(connection.claims.sub)
      ) {
        this.#worker.postMessage({ type: "leave", playerId: connection.claims.sub });
      }
      this.#broadcastPresence();
    }
    if (this.#clients.size === 0) this.#onEmpty();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    for (const connection of this.#clients.values()) {
      clearTimeout(connection.expiryTimer);
      connection.socket.close(1012, "room restarted");
    }
    this.#clients.clear();
    this.#coordinatedControllers.clear();
    this.#isCoordinatorAuthority = false;
    const coordinator = this.#coordinator;
    this.#coordinator = null;
    if (coordinator) void coordinator.close();
    this.#clearReadyTimer();
    this.#worker.postMessage({ type: "dispose" });
    setTimeout(() => void this.#worker.terminate(), 2_000).unref();
  }

  #onWorkerMessage(message: WorkerMessage): void {
    if (message.type === "ready") {
      this.#clearReadyTimer();
      this.#resolveReady();
      return;
    }
    if (message.type === "snapshot") {
      const snapshot: CoordinatedSnapshot = {
        tick: message.tick ?? 0,
        serverTime: message.serverTime ?? Date.now(),
        state: message.state,
      };
      if (this.#coordinator) {
        if (this.#isCoordinatorAuthority) {
          void this.#coordinator
            .publishSnapshot(snapshot)
            .catch((error) => this.#coordinationFailed(error));
        }
      } else {
        this.#broadcast({ type: "snapshot", ...snapshot }, true);
      }
      return;
    }
    if (message.type === "error") {
      this.#broadcast({
        type: "error",
        code: "GAME_ERROR",
        message: message.message ?? "Game error",
        fatal: Boolean(message.fatal),
      });
      if (message.fatal) this.close();
    }
  }

  #hasOtherController(playerId: string, exceptId?: string): boolean {
    return [...this.#clients.values()].some(
      (connection) =>
        connection.id !== exceptId &&
        connection.claims.role === "controller" &&
        connection.claims.sub === playerId,
    );
  }

  #charge(connection: ClientConnection): boolean {
    const now = Date.now();
    if (now - connection.windowStartedAt >= 10_000) {
      connection.windowStartedAt = now;
      connection.messagesInWindow = 0;
    }
    connection.messagesInWindow += 1;
    return connection.messagesInWindow <= 700;
  }

  #broadcastPresence(): void {
    this.#broadcast({
      type: "presence",
      players: [...this.#clients.values()].map((connection) => ({
        playerId: connection.claims.sub,
        role: connection.claims.role,
        mode: connection.claims.mode,
        connectedAt: connection.connectedAt,
      })),
    });
  }

  #broadcast(message: unknown, droppableSnapshot = false): void {
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

  #coordinationFailed(reason: unknown): void {
    if (this.#closed) return;
    this.#broadcast({
      type: "error",
      code: "COORDINATION_UNAVAILABLE",
      message: reason instanceof Error ? reason.message : "Shared room coordination is unavailable",
      fatal: true,
    });
    this.close();
  }

  #clearReadyTimer(): void {
    if (!this.#readyTimer) return;
    clearTimeout(this.#readyTimer);
    this.#readyTimer = null;
  }

  #send(socket: WebSocket, message: unknown): void {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }
}

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
