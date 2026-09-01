import type {
  CoordinatedInput,
  CoordinatedPresencePlayer,
  CoordinatedSnapshot,
} from "./room-coordinator.js";

export const PRESENCE_STALE_MS = 45_000;
export const PRESENCE_REFRESH_MS = 10_000;
export const KEY_TTL_SECONDS = 60 * 60;
export const MAX_EVENT_BYTES = 256 * 1024;

export type RedisRoomEvent =
  | { type: "presence" }
  | { type: "input"; input: CoordinatedInput }
  | { type: "snapshot"; snapshot: CoordinatedSnapshot };

export function parsePresence(encoded: string): CoordinatedPresencePlayer | null {
  try {
    const value = JSON.parse(encoded) as Partial<CoordinatedPresencePlayer>;
    if (
      typeof value.connectionId !== "string" ||
      typeof value.instanceId !== "string" ||
      typeof value.playerId !== "string" ||
      (value.role !== "controller" && value.role !== "display") ||
      (value.mode !== "remote" && value.mode !== "handheld") ||
      typeof value.connectedAt !== "number"
    )
      return null;
    return value as CoordinatedPresencePlayer;
  } catch {
    return null;
  }
}

export function parseEvent(encoded: string): RedisRoomEvent | null {
  try {
    const value = JSON.parse(encoded) as RedisRoomEvent;
    if (value.type === "presence") return value;
    if (value.type === "input" && value.input && typeof value.input.playerId === "string")
      return value;
    if (value.type === "snapshot" && value.snapshot && Number.isFinite(value.snapshot.tick))
      return value;
    return null;
  } catch {
    return null;
  }
}
