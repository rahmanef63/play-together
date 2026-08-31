import type { ConnectionRole, ControllerMode } from "@play-together/contracts";

export interface CoordinatedPresencePlayer {
  connectionId: string;
  instanceId: string;
  playerId: string;
  role: ConnectionRole;
  mode: ControllerMode;
  connectedAt: number;
}

export interface CoordinatedInput {
  playerId: string;
  connectedAt: number;
  payload: unknown;
  sequence: number;
}

export interface CoordinatedSnapshot {
  tick: number;
  serverTime: number;
  state: unknown;
}

export interface RoomCoordinatorCallbacks {
  onPresence(players: CoordinatedPresencePlayer[]): void;
  onInput(input: CoordinatedInput): void;
  onSnapshot(snapshot: CoordinatedSnapshot): void;
}

export interface RoomCoordinatorHandle {
  readonly instanceId: string;
  start(): Promise<void>;
  register(player: Omit<CoordinatedPresencePlayer, "instanceId">): Promise<void>;
  heartbeat(connectionId: string): Promise<void>;
  unregister(connectionId: string): Promise<void>;
  publishInput(input: CoordinatedInput): Promise<void>;
  publishSnapshot(snapshot: CoordinatedSnapshot): Promise<void>;
  close(): Promise<void>;
}

export interface RoomCoordinator {
  attach(roomKey: string, callbacks: RoomCoordinatorCallbacks): Promise<RoomCoordinatorHandle>;
  close(): Promise<void>;
}

export function authorityInstanceId(players: CoordinatedPresencePlayer[]): string | null {
  const candidates = players.filter(
    (player) =>
      player.role === "display" || (player.role === "controller" && player.mode === "handheld"),
  );
  const pool = candidates.length > 0 ? candidates : players;
  const authority = [...pool].sort(
    (left, right) =>
      left.connectedAt - right.connectedAt ||
      left.instanceId.localeCompare(right.instanceId) ||
      left.connectionId.localeCompare(right.connectionId),
  )[0];
  return authority?.instanceId ?? null;
}
