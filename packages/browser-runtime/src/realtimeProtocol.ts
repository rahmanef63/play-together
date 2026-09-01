import type { ClientMessage, RuntimeTelemetry } from "@play-together/contracts";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "closed";
export type Listener<T> = (value: T) => void;

export interface ConnectionTicket {
  token: string;
  expiresAt: number;
}

export interface RealtimeClientOptions {
  baseUrl: string;
  initialTicket: ConnectionTicket;
  refreshTicket?: () => Promise<ConnectionTicket>;
  reconnect?: boolean;
  telemetry?: (rttMs: number | null) => RuntimeTelemetry | undefined;
  WebSocketImpl?: typeof WebSocket;
}

export const BASE_PROTOCOL = "play-together.v1";
export const CONNECT_TIMEOUT_MS = 8_000;
export const TICKET_PROTOCOL_PREFIX = "ptt.";
export const REFRESH_SKEW_MS = 15_000;

export function createInputMessage(sequence: number, payload: unknown): ClientMessage {
  return { type: "input", seq: sequence, sentAt: Date.now(), payload };
}
