import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { TicketClaims } from "@play-together/contracts";
import type { ResolvedGameModule } from "../modules/module-store.js";
import type {
  RealtimeMetrics,
  WorkerPerformanceSample,
} from "../observability/realtime-metrics.js";
import type { CoordinatedSnapshot } from "./room-coordinator.js";

const WORKER_READY_TIMEOUT_MS = 8_000;
export const PLAYER_DISCONNECT_GRACE_MS = 8_000;

interface WorkerMessage {
  type: "ready" | "snapshot" | "performance" | "error" | "disposed";
  tick?: number;
  serverTime?: number;
  state?: unknown;
  message?: string;
  fatal?: boolean;
  performance?: WorkerPerformanceSample;
}

interface WorkerCallbacks {
  onSnapshot: (snapshot: CoordinatedSnapshot) => void;
  onGameError: (message: string, fatal: boolean) => void;
  onFatal: (
    code: "GAME_WORKER_TIMEOUT" | "GAME_WORKER_CRASH" | "GAME_WORKER_EXIT",
    message: string,
  ) => void;
}

export class RoomGameWorker {
  readonly ready: Promise<void>;
  readonly #worker: Worker;
  readonly #callbacks: WorkerCallbacks;
  readonly #metrics: RealtimeMetrics;
  #resolveReady!: () => void;
  #rejectReady!: (error: Error) => void;
  #readyTimer: ReturnType<typeof setTimeout> | null = null;
  #closed = false;
  readonly #pendingLeaves = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    claims: TicketClaims,
    module: ResolvedGameModule,
    callbacks: WorkerCallbacks,
    metrics: RealtimeMetrics,
    workerScriptPath?: string,
  ) {
    this.#callbacks = callbacks;
    this.#metrics = metrics;
    this.ready = new Promise((resolve, reject) => {
      this.#resolveReady = resolve;
      this.#rejectReady = reject;
    });
    this.#readyTimer = setTimeout(() => {
      const error = new Error("Game worker did not become ready in time");
      this.#rejectReady(error);
      this.#metrics.workerFatal();
      this.#callbacks.onFatal(
        "GAME_WORKER_TIMEOUT",
        "This room's game process did not start in time",
      );
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
      resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
    });
    this.#worker.on("message", (message: WorkerMessage) => this.#onMessage(message));
    this.#worker.on("error", (error) => {
      this.#clearReadyTimer();
      this.#rejectReady(error instanceof Error ? error : new Error(String(error)));
      this.#metrics.workerFatal();
      this.#callbacks.onFatal("GAME_WORKER_CRASH", "This room's game process stopped");
    });
    this.#worker.on("exit", (code) => {
      this.#clearReadyTimer();
      if (!this.#closed && code !== 0) {
        this.#metrics.workerFatal();
        this.#callbacks.onFatal("GAME_WORKER_EXIT", "This room's game process exited");
      }
    });
  }

  join(playerId: string, connectedAt: number): void {
    const pending = this.#pendingLeaves.get(playerId);
    if (pending) {
      clearTimeout(pending);
      this.#pendingLeaves.delete(playerId);
      return;
    }
    this.#worker.postMessage({ type: "join", playerId, connectedAt });
  }
  leave(playerId: string): void {
    if (this.#closed || this.#pendingLeaves.has(playerId)) return;
    const timer = setTimeout(() => {
      this.#pendingLeaves.delete(playerId);
      if (!this.#closed) this.#worker.postMessage({ type: "leave", playerId });
    }, PLAYER_DISCONNECT_GRACE_MS);
    timer.unref();
    this.#pendingLeaves.set(playerId, timer);
  }
  input(playerId: string, payload: unknown, sequence: number): void {
    this.#worker.postMessage({ type: "input", playerId, payload, sequence });
  }
  dispose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#clearReadyTimer();
    for (const timer of this.#pendingLeaves.values()) clearTimeout(timer);
    this.#pendingLeaves.clear();
    this.#worker.postMessage({ type: "dispose" });
    setTimeout(() => void this.#worker.terminate(), 2_000).unref();
  }

  #onMessage(message: WorkerMessage): void {
    if (message.type === "ready") {
      this.#clearReadyTimer();
      this.#resolveReady();
      return;
    }
    if (message.type === "snapshot") {
      this.#metrics.snapshotGenerated();
      this.#callbacks.onSnapshot({
        tick: message.tick ?? 0,
        serverTime: message.serverTime ?? Date.now(),
        state: message.state,
      });
      return;
    }
    if (message.type === "performance" && message.performance) {
      this.#metrics.workerPerformance(message.performance);
      return;
    }
    if (message.type === "error") {
      this.#metrics.gameError();
      this.#callbacks.onGameError(message.message ?? "Game error", Boolean(message.fatal));
    }
  }

  #clearReadyTimer(): void {
    if (!this.#readyTimer) return;
    clearTimeout(this.#readyTimer);
    this.#readyTimer = null;
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
