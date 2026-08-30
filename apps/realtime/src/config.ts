import { resolve } from "node:path";

export interface GatewayConfig {
  host: string;
  port: number;
  connectPath: string;
  ticketSecret: string;
  allowedOrigins: ReadonlySet<string>;
  moduleOrigins: ReadonlySet<string>;
  moduleOriginMap: ReadonlyMap<string, string>;
  allowInsecureModuleOrigins: boolean;
  moduleCacheDirectory: string;
  workerScriptPath: string | undefined;
  allowMissingOrigin: boolean;
  roomIdleTimeoutMs: number;
  maxPayloadBytes: number;
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
  const ticketSecret = environment.JOIN_TICKET_SECRET ?? "";
  if (Buffer.byteLength(ticketSecret) < 32) {
    throw new Error("JOIN_TICKET_SECRET must contain at least 32 bytes");
  }
  const allowedOrigins = list(environment.ALLOWED_ORIGINS);
  const moduleOrigins = list(environment.GAME_MODULE_ORIGINS);
  if (environment.VERCEL_URL) {
    const deploymentOrigin = new URL(`https://${environment.VERCEL_URL}`).origin;
    allowedOrigins.add(deploymentOrigin);
    moduleOrigins.add(deploymentOrigin);
  }
  if (environment.VERCEL_PROJECT_PRODUCTION_URL) {
    const productionOrigin = new URL(`https://${environment.VERCEL_PROJECT_PRODUCTION_URL}`).origin;
    allowedOrigins.add(productionOrigin);
    moduleOrigins.add(productionOrigin);
  }
  const moduleOriginMap = originMap(environment.GAME_MODULE_FETCH_ORIGIN_MAP);
  if (allowedOrigins.size === 0) throw new Error("ALLOWED_ORIGINS must not be empty");
  if (moduleOrigins.size === 0) throw new Error("GAME_MODULE_ORIGINS must not be empty");
  return {
    host: environment.HOST ?? "0.0.0.0",
    port: Number(environment.PORT ?? 8787),
    connectPath: environment.REALTIME_CONNECT_PATH ?? "/v1/connect",
    ticketSecret,
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
  };
}
