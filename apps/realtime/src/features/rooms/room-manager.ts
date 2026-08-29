import type { TicketClaims } from "@play-together/contracts";
import type { WebSocket } from "ws";
import type { GameModuleStore } from "../modules/module-store";
import { RoomSession } from "./room-session";

export class RoomManager {
  readonly #moduleStore: GameModuleStore;
  readonly #idleTimeoutMs: number;
  readonly #sessions = new Map<string, RoomSession>();
  readonly #startingSessions = new Map<string, Promise<RoomSession>>();
  readonly #idleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(moduleStore: GameModuleStore, idleTimeoutMs: number) {
    this.#moduleStore = moduleStore;
    this.#idleTimeoutMs = idleTimeoutMs;
  }

  get size(): number {
    return this.#sessions.size;
  }

  async add(
    socket: WebSocket,
    claims: TicketClaims,
  ): Promise<{ session: RoomSession; connectionId: string }> {
    const key = this.#key(claims);
    const pendingTimer = this.#idleTimers.get(key);
    if (pendingTimer) clearTimeout(pendingTimer);
    this.#idleTimers.delete(key);

    const session = await this.#getOrStartSession(key, claims);
    const connectionId = await session.add(socket, claims);
    return { session, connectionId };
  }

  closeAll(): void {
    for (const timer of this.#idleTimers.values()) clearTimeout(timer);
    this.#idleTimers.clear();
    for (const session of this.#sessions.values()) session.close();
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
    const gameModule = await this.#moduleStore.resolve(claims);
    const existing = this.#sessions.get(key);
    if (existing) return existing;
    const session = new RoomSession(claims, gameModule, () => this.#scheduleClose(key));
    this.#sessions.set(key, session);
    return session;
  }

  #scheduleClose(key: string): void {
    const session = this.#sessions.get(key);
    if (!session || session.size > 0 || this.#idleTimers.has(key)) return;
    const timer = setTimeout(() => {
      const current = this.#sessions.get(key);
      if (current && current.size === 0) {
        current.close();
        this.#sessions.delete(key);
      }
      this.#idleTimers.delete(key);
    }, this.#idleTimeoutMs);
    timer.unref();
    this.#idleTimers.set(key, timer);
  }

  #key(claims: TicketClaims): string {
    return `${claims.roomId}:${claims.gameId}@${claims.gameVersion}:${claims.manifestSha256}`;
  }
}
