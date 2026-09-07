import { resolve } from "node:path";

export interface GatewayConfig {
  host: string;
  port: number;
  connectPath: string;
  ticketSecret: string;
  ticketSecrets: readonly string[];
  ticketVerifierConvexUrl: string | undefined;
  ticketVerifierTimeoutMs: number;
  allowedOrigins: ReadonlySet<string>;
  moduleOrigins: ReadonlySet<string>;
  moduleOriginMap: ReadonlyMap<string, string>;
  allowInsecureModuleOrigins: boolean;
  moduleCacheDirectory: string;
  workerScriptPath: string | undefined;
  allowMissingOrigin: boolean;
  roomIdleTimeoutMs: number;
  maxPayloadBytes: number;
  redisUrl: string | undefined;
  requireDistributedCoordination: boolean;
}

function originMap(value: string | undefined): Map<string, string> {
  if (!value) return new Map();
  const parsed = JSON.parse(value) as Record<string, unknown>;
  const entries = Object.entries(parsed).map(([publicOrigin, internalOrigin]) => {
    if (typeof internalOrigin !== "string")
      throw new Error("GAME_MODULE_FETCH_ORIGIN_MAP values must be strings");
    return [new URL(publicOrigin).origin, new URL(internalOrigin).origin] as const;
  });
  return new Map(entries);
}

function list(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const ticketVerifierConvexUrl = environment.TICKET_VERIFIER_CONVEX_URL?.trim() || undefined;
  if (ticketVerifierConvexUrl) {
    const parsed = new URL(ticketVerifierConvexUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("TICKET_VERIFIER_CONVEX_URL must use http or https");
    }
  }
  const ticketVerifierTimeoutMs = Number(environment.TICKET_VERIFIER_TIMEOUT_MS ?? 5_000);
  if (
    !Number.isFinite(ticketVerifierTimeoutMs) ||
    ticketVerifierTimeoutMs < 500 ||
    ticketVerifierTimeoutMs > 15_000
  ) {
    throw new Error("TICKET_VERIFIER_TIMEOUT_MS must be between 500 and 15000");
  }
  const ticketSecret = environment.JOIN_TICKET_SECRET?.trim() ?? "";
  if (ticketSecret && Buffer.byteLength(ticketSecret) < 32) {
    throw new Error("JOIN_TICKET_SECRET must contain at least 32 bytes when set");
  }
  if (!ticketVerifierConvexUrl && Buffer.byteLength(ticketSecret) < 32) {
    throw new Error("JOIN_TICKET_SECRET or TICKET_VERIFIER_CONVEX_URL is required");
  }
  const nextTicketSecret = environment.JOIN_TICKET_SECRET_NEXT?.trim() ?? "";
  if (nextTicketSecret && Buffer.byteLength(nextTicketSecret) < 32) {
    throw new Error("JOIN_TICKET_SECRET_NEXT must contain at least 32 bytes when set");
  }
  const ticketSecrets = [ticketSecret, nextTicketSecret].filter(
    (secret, index, values) => secret && values.indexOf(secret) === index,
  );
  const allowedOrigins = list(environment.ALLOWED_ORIGINS);
  const moduleOrigins = list(environment.GAME_MODULE_ORIGINS);
  const moduleOriginMap = originMap(environment.GAME_MODULE_FETCH_ORIGIN_MAP);
  if (allowedOrigins.size === 0) throw new Error("ALLOWED_ORIGINS must not be empty");
  if (moduleOrigins.size === 0) throw new Error("GAME_MODULE_ORIGINS must not be empty");
  const redisUrl = environment.REDIS_URL?.trim() || undefined;
  const requireDistributedCoordination = environment.REQUIRE_DISTRIBUTED_COORDINATION === "true";
  if (requireDistributedCoordination && !redisUrl) {
    throw new Error("REDIS_URL is required when distributed room coordination is enabled");
  }
  return {
    host: environment.HOST ?? "0.0.0.0",
    port: Number(environment.PORT ?? 8787),
    connectPath: environment.REALTIME_CONNECT_PATH ?? "/v1/connect",
    ticketSecret,
    ticketSecrets,
    ticketVerifierConvexUrl,
    ticketVerifierTimeoutMs,
    allowedOrigins,
    moduleOrigins,
    moduleOriginMap,
    allowInsecureModuleOrigins: environment.ALLOW_INSECURE_GAME_ORIGINS === "true",
    moduleCacheDirectory: resolve(environment.MODULE_CACHE_DIR ?? ".cache/game-modules"),
    workerScriptPath: environment.GAME_WORKER_PATH
      ? resolve(environment.GAME_WORKER_PATH)
      : undefined,
    allowMissingOrigin: environment.ALLOW_MISSING_ORIGIN === "true",
    roomIdleTimeoutMs: Number(environment.ROOM_IDLE_TIMEOUT_MS ?? 30_000),
    maxPayloadBytes: Number(environment.MAX_PAYLOAD_BYTES ?? 65_536),
    redisUrl,
    requireDistributedCoordination,
  };
}
