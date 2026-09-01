import type { ServerMessage, SnapshotMessage } from "@play-together/contracts";
import type { ConnectionStatus, Listener } from "./realtimeProtocol.js";

export class RealtimeSubscriptions {
  readonly #snapshots = new Set<Listener<SnapshotMessage>>();
  readonly #messages = new Set<Listener<ServerMessage>>();
  readonly #statuses = new Set<Listener<ConnectionStatus>>();

  snapshot(listener: Listener<SnapshotMessage>, latest: SnapshotMessage | null): () => void {
    this.#snapshots.add(listener);
    if (latest) listener(latest);
    return () => this.#snapshots.delete(listener);
  }

  message(listener: Listener<ServerMessage>): () => void {
    this.#messages.add(listener);
    return () => this.#messages.delete(listener);
  }

  status(listener: Listener<ConnectionStatus>, current: ConnectionStatus): () => void {
    this.#statuses.add(listener);
    listener(current);
    return () => this.#statuses.delete(listener);
  }

  emitSnapshot(snapshot: SnapshotMessage): void {
    for (const listener of this.#snapshots) listener(snapshot);
  }

  emitMessage(message: ServerMessage): void {
    for (const listener of this.#messages) listener(message);
  }

  emitStatus(status: ConnectionStatus): void {
    for (const listener of this.#statuses) listener(status);
  }
}
