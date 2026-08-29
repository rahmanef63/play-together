export const SNAPSHOT_SOFT_BUFFER_LIMIT_BYTES = 512 * 1024;
export const SOCKET_HARD_BUFFER_LIMIT_BYTES = 2 * 1024 * 1024;

export type SocketPressure = "send" | "drop-snapshot" | "close";

export function classifySocketPressure(bufferedAmount: number): SocketPressure {
  if (!Number.isFinite(bufferedAmount) || bufferedAmount < 0) return "close";
  if (bufferedAmount >= SOCKET_HARD_BUFFER_LIMIT_BYTES) return "close";
  if (bufferedAmount >= SNAPSHOT_SOFT_BUFFER_LIMIT_BYTES) return "drop-snapshot";
  return "send";
}
