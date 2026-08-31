import type {
  CoordinatedInput,
  CoordinatedPresencePlayer,
  CoordinatedSnapshot,
  RoomCoordinatorHandle,
} from "./room-coordinator.js";
import { authorityInstanceId } from "./room-coordinator.js";
import type { RoomGameWorker } from "./room-game-worker.js";
import type { RoomSessionClients } from "./room-session-clients.js";

export class RoomSessionDistribution {
  readonly #worker: RoomGameWorker;
  readonly #clients: RoomSessionClients;
  readonly #onFailure: (reason: unknown) => void;
  #coordinator: RoomCoordinatorHandle | null = null;
  #controllers = new Map<string, number>();
  #isAuthority = false;

  constructor(
    worker: RoomGameWorker,
    clients: RoomSessionClients,
    onFailure: (reason: unknown) => void,
  ) {
    this.#worker = worker;
    this.#clients = clients;
    this.#onFailure = onFailure;
  }

  get active(): boolean {
    return this.#coordinator !== null;
  }

  attach(coordinator: RoomCoordinatorHandle): void {
    if (this.#coordinator) throw new Error("Room coordinator is already attached");
    this.#coordinator = coordinator;
  }

  syncPresence(players: CoordinatedPresencePlayer[]): void {
    if (!this.#coordinator) return;
    this.#isAuthority = authorityInstanceId(players) === this.#coordinator.instanceId;
    const next = new Map<string, number>();
    for (const player of players) {
      if (player.role !== "controller") continue;
      const current = next.get(player.playerId);
      if (current === undefined || player.connectedAt < current)
        next.set(player.playerId, player.connectedAt);
    }
    for (const [playerId, connectedAt] of next) {
      if (!this.#controllers.has(playerId)) this.#worker.join(playerId, connectedAt);
    }
    for (const playerId of this.#controllers.keys()) {
      if (!next.has(playerId)) this.#worker.leave(playerId);
    }
    this.#controllers = next;
    this.#clients.broadcast({
      type: "presence",
      players: players.map((player) => ({
        playerId: player.playerId,
        role: player.role,
        mode: player.mode,
        connectedAt: player.connectedAt,
      })),
    });
  }

  handleInput(input: CoordinatedInput): void {
    if (!this.#coordinator) return;
    if (!this.#controllers.has(input.playerId)) {
      this.#controllers.set(input.playerId, input.connectedAt);
      this.#worker.join(input.playerId, input.connectedAt);
    }
    this.#worker.input(input.playerId, input.payload, input.sequence);
  }

  handleSnapshot(snapshot: CoordinatedSnapshot): void {
    if (this.#coordinator) this.#clients.broadcast({ type: "snapshot", ...snapshot }, true);
  }

  publishSnapshot(snapshot: CoordinatedSnapshot): boolean {
    if (!this.#coordinator) return false;
    if (this.#isAuthority) void this.#coordinator.publishSnapshot(snapshot).catch(this.#onFailure);
    return true;
  }

  async register(
    connectionId: string,
    player: Omit<CoordinatedPresencePlayer, "connectionId" | "instanceId">,
  ): Promise<boolean> {
    if (!this.#coordinator) return false;
    await this.#coordinator.register({ connectionId, ...player });
    return true;
  }

  heartbeat(connectionId: string): boolean {
    if (!this.#coordinator) return false;
    void this.#coordinator.heartbeat(connectionId).catch(this.#onFailure);
    return true;
  }

  unregister(connectionId: string): boolean {
    if (!this.#coordinator) return false;
    void this.#coordinator.unregister(connectionId).catch(this.#onFailure);
    return true;
  }

  publishInput(input: CoordinatedInput): boolean {
    if (!this.#coordinator) return false;
    void this.#coordinator.publishInput(input).catch(this.#onFailure);
    return true;
  }

  close(): void {
    this.#controllers.clear();
    this.#isAuthority = false;
    const coordinator = this.#coordinator;
    this.#coordinator = null;
    if (coordinator) void coordinator.close();
  }
}
