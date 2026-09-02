import {
  BASE_PROTOCOL,
  type ConnectionTicket,
  REFRESH_SKEW_MS,
  type RealtimeClientOptions,
  TICKET_PROTOCOL_PREFIX,
} from "./realtimeProtocol.js";

export function createRealtimeSocket(
  options: RealtimeClientOptions,
  ticket: ConnectionTicket,
): WebSocket {
  const WebSocketConstructor = options.WebSocketImpl ?? WebSocket;
  const endpoint = new URL(options.baseUrl);
  endpoint.searchParams.delete("ticket");
  return new WebSocketConstructor(endpoint.toString(), [
    BASE_PROTOCOL,
    `${TICKET_PROTOCOL_PREFIX}${ticket.token}`,
  ]);
}

export function closeForRecovery(socket: WebSocket | null, reason: string): void {
  try {
    socket?.close(4002, reason);
  } catch {
    // Recovery continues even if a stale browser socket refuses to close cleanly.
  }
}

export function reconnectDelay(attempt: number, immediate: boolean): number {
  if (immediate) return 0;
  return Math.min(10_000, 300 * 2 ** Math.min(attempt, 5)) + Math.random() * 250;
}

export function needsTicketRefresh(ticket: ConnectionTicket, attempt: number): boolean {
  return attempt > 0 || ticket.expiresAt <= Date.now() + REFRESH_SKEW_MS;
}

export async function refreshConnectionTicket(
  options: RealtimeClientOptions,
): Promise<ConnectionTicket> {
  if (!options.refreshTicket) throw new Error("Realtime ticket expired");
  return options.refreshTicket();
}

export function ticketRefreshDelay(ticket: ConnectionTicket): number {
  return Math.max(1_000, ticket.expiresAt - Date.now() - REFRESH_SKEW_MS);
}
