import { randomUUID } from "node:crypto";
import type {
  CoordinatedInput,
  CoordinatedPresencePlayer,
  CoordinatedSnapshot,
  RoomCoordinator,
  RoomCoordinatorCallbacks,
  RoomCoordinatorHandle,
} from "./room-coordinator.js";

interface RoomState {
  players: Map<string, CoordinatedPresencePlayer>;
  handles: Set<MemoryHandle>;
}

export class InMemoryRoomCoordinator implements RoomCoordinator {
  readonly #rooms = new Map<string, RoomState>();

  async attach(
    roomKey: string,
    callbacks: RoomCoordinatorCallbacks,
  ): Promise<RoomCoordinatorHandle> {
    const room = this.#rooms.get(roomKey) ?? { players: new Map(), handles: new Set() };
    this.#rooms.set(roomKey, room);
    return new MemoryHandle(randomUUID(), room, callbacks, () => {
      if (room.handles.size === 0 && room.players.size === 0) this.#rooms.delete(roomKey);
    });
  }

  async close(): Promise<void> {
    for (const room of this.#rooms.values()) {
      for (const handle of [...room.handles]) await handle.close();
    }
    this.#rooms.clear();
  }
}

class MemoryHandle implements RoomCoordinatorHandle {
  readonly instanceId: string;
  readonly #room: RoomState;
  readonly #callbacks: RoomCoordinatorCallbacks;
  readonly #afterClose: () => void;
  readonly #ownedConnections = new Set<string>();
  #started = false;
  #closed = false;

  constructor(
    instanceId: string,
    room: RoomState,
    callbacks: RoomCoordinatorCallbacks,
    afterClose: () => void,
  ) {
    this.instanceId = instanceId;
    this.#room = room;
    this.#callbacks = callbacks;
    this.#afterClose = afterClose;
  }

  async start(): Promise<void> {
    if (this.#closed || this.#started) return;
    this.#started = true;
    this.#room.handles.add(this);
    this.#emitPresence();
  }

  async register(player: Omit<CoordinatedPresencePlayer, "instanceId">): Promise<void> {
    if (this.#closed) throw new Error("Room coordinator handle is closed");
    this.#ownedConnections.add(player.connectionId);
    this.#room.players.set(player.connectionId, { ...player, instanceId: this.instanceId });
    this.#emitPresence();
  }

  async heartbeat(_connectionId: string): Promise<void> {}

  async unregister(connectionId: string): Promise<void> {
    this.#ownedConnections.delete(connectionId);
    this.#room.players.delete(connectionId);
    this.#emitPresence();
    this.#afterClose();
  }

  async publishInput(input: CoordinatedInput): Promise<void> {
    for (const handle of this.#room.handles) handle.#callbacks.onInput(input);
  }

  async publishSnapshot(snapshot: CoordinatedSnapshot): Promise<void> {
    for (const handle of this.#room.handles) handle.#callbacks.onSnapshot(snapshot);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#room.handles.delete(this);
    for (const connectionId of this.#ownedConnections) this.#room.players.delete(connectionId);
    this.#ownedConnections.clear();
    this.#emitPresence();
    this.#afterClose();
  }

  #emitPresence(): void {
    const players = [...this.#room.players.values()];
    for (const handle of this.#room.handles) handle.#callbacks.onPresence(players);
  }
}
