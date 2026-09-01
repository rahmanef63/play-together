import {
  type ReleaseControlEvent,
  releaseIdentityKey,
  type TicketClaims,
} from "@play-together/contracts";
import type { WebSocket } from "ws";
import type { GameModuleStore } from "../modules/module-store.js";
import type { RealtimeMetrics } from "../observability/realtime-metrics.js";
import { ReleaseBlockedError } from "../releases/release-control.js";
import type { RoomCoordinator } from "./room-coordinator.js";
import { RoomSession } from "./room-session.js";

export class RoomManager {
  readonly #moduleStore: GameModuleStore;
  readonly #idleTimeoutMs: number;
  readonly #workerScriptPath: string | undefined;
  readonly #coordinator: RoomCoordinator | null;
  readonly #metrics: RealtimeMetrics;
  readonly #sessions = new Map<string, RoomSession>();
  readonly #startingSessions = new Map<string, Promise<RoomSession>>();
  readonly #idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly #blockedReleases = new Set<string>();

  constructor(
    moduleStore: GameModuleStore,
    idleTimeoutMs: number,
    workerScriptPath: string | undefined,
    coordinator: RoomCoordinator | null,
    metrics: RealtimeMetrics,
  ) {
    this.#moduleStore = moduleStore;
    this.#idleTimeoutMs = idleTimeoutMs;
    this.#workerScriptPath = workerScriptPath;
    this.#coordinator = coordinator;
    this.#metrics = metrics;
  }

  get size(): number {
    return this.#sessions.size;
  }

  get connectionCount(): number {
    let count = 0;
    for (const session of this.#sessions.values()) count += session.size;
    return count;
  }

  get blockedReleaseCount(): number {
    return this.#blockedReleases.size;
  }

  applyReleaseStatus(event: ReleaseControlEvent): { sessions: number; connections: number } {
    const releaseKey = releaseIdentityKey(event);
    if (event.status !== "blocked") {
      this.#blockedReleases.delete(releaseKey);
      return { sessions: 0, connections: 0 };
    }
    if (this.#blockedReleases.has(releaseKey)) return { sessions: 0, connections: 0 };
    this.#blockedReleases.add(releaseKey);
    let sessions = 0;
    let connections = 0;
    for (const [key, session] of this.#sessions) {
      if (!session.key.endsWith(`:${releaseKey}`)) continue;
      const timer = this.#idleTimers.get(key);
      if (timer) clearTimeout(timer);
      this.#idleTimers.delete(key);
      this.#sessions.delete(key);
      sessions += 1;
      connections += session.blockRelease();
      this.#metrics.sessionClosed();
    }
    this.#metrics.releaseBlock(sessions, connections);
    return { sessions, connections };
  }

  async add(
    socket: WebSocket,
    claims: TicketClaims,
  ): Promise<{ session: RoomSession; connectionId: string }> {
    this.#assertReleaseAllowed(claims);
    const key = this.#key(claims);
    const pendingTimer = this.#idleTimers.get(key);
    if (pendingTimer) clearTimeout(pendingTimer);
    this.#idleTimers.delete(key);

    const session = await this.#getOrStartSession(key, claims);
    this.#assertReleaseAllowed(claims);
    const connectionId = await session.add(socket, claims);
    return { session, connectionId };
  }

  closeAll(): void {
    for (const timer of this.#idleTimers.values()) clearTimeout(timer);
    this.#idleTimers.clear();
    for (const session of this.#sessions.values()) {
      session.close();
      this.#metrics.sessionClosed();
    }
    this.#sessions.clear();
    this.#startingSessions.clear();
  }

  async #getOrStartSession(key: string, claims: TicketClaims): Promise<RoomSession> {
    const existing = this.#sessions.get(key);
    if (existing) return existing;

    const starting = this.#startingSessions.get(key);
    if (starting) return starting;

    const creation = this.#createSession(key, claims);
    this.#startingSessions.set(key, creation);
    try {
      return await creation;
    } finally {
      if (this.#startingSessions.get(key) === creation) this.#startingSessions.delete(key);
    }
  }

  async #createSession(key: string, claims: TicketClaims): Promise<RoomSession> {
    this.#assertReleaseAllowed(claims);
    const gameModule = await this.#moduleStore.resolve(claims);
    this.#assertReleaseAllowed(claims);
    const existing = this.#sessions.get(key);
    if (existing) return existing;
    const session = new RoomSession(
      claims,
      gameModule,
      () => this.#scheduleClose(key),
      this.#metrics,
      this.#workerScriptPath,
    );
    try {
      if (this.#coordinator) {
        const handle = await this.#coordinator.attach(key, {
          onPresence: (players) => session.syncDistributedPresence(players),
          onInput: (input) => session.handleDistributedInput(input),
          onSnapshot: (snapshot) => session.handleDistributedSnapshot(snapshot),
        });
        session.attachCoordinator(handle);
        await handle.start();
      }
      this.#assertReleaseAllowed(claims);
      this.#sessions.set(key, session);
      this.#metrics.sessionStarted();
      return session;
    } catch (error) {
      session.close();
      throw error;
    }
  }

  #scheduleClose(key: string): void {
    const session = this.#sessions.get(key);
    if (!session || session.size > 0 || this.#idleTimers.has(key)) return;
    const timer = setTimeout(() => {
      const current = this.#sessions.get(key);
      if (current && current.size === 0) {
        current.close();
        this.#sessions.delete(key);
        this.#metrics.sessionClosed();
      }
      this.#idleTimers.delete(key);
    }, this.#idleTimeoutMs);
    timer.unref();
    this.#idleTimers.set(key, timer);
  }

  #assertReleaseAllowed(claims: TicketClaims): void {
    const identity = {
      gameId: claims.gameId,
      version: claims.gameVersion,
      manifestSha256: claims.manifestSha256,
    };
    if (this.#blockedReleases.has(releaseIdentityKey(identity)))
      throw new ReleaseBlockedError(identity);
  }

  #key(claims: TicketClaims): string {
    return `${claims.roomId}:${claims.gameId}@${claims.gameVersion}:${claims.manifestSha256}`;
  }
}
