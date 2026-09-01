import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { type GatewayConfig, loadConfig } from "./config.js";
import { GameModuleStore } from "./features/modules/module-store.js";
import { RealtimeMetrics } from "./features/observability/realtime-metrics.js";
import { RedisReleaseControl } from "./features/releases/redis-release-control.js";
import type { ReleaseControl } from "./features/releases/release-control.js";
import { RedisRoomCoordinator } from "./features/rooms/redis-room-coordinator.js";
import type { RoomCoordinator } from "./features/rooms/room-coordinator.js";
import { RoomManager } from "./features/rooms/room-manager.js";
import { TicketReplayGuard } from "./features/tickets/replay-guard.js";
import { createRealtimeHttpHandler } from "./gateway/http-handler.js";
import { attachWebSocketGateway } from "./gateway/websocket-gateway.js";

export { loadConfig };

export interface GatewayOptions {
  roomCoordinator?: RoomCoordinator | null;
  releaseControl?: ReleaseControl | null;
}

export interface GatewayHandle {
  server: Server;
  listen(): Promise<{ host: string; port: number }>;
  close(): Promise<void>;
  roomCount(): number;
}

export function createGateway(config: GatewayConfig, options: GatewayOptions = {}): GatewayHandle {
  const moduleStore = new GameModuleStore(
    config.moduleCacheDirectory,
    config.moduleOrigins,
    config.moduleOriginMap,
    config.allowInsecureModuleOrigins,
  );
  const replayGuard = new TicketReplayGuard();
  const metrics = new RealtimeMetrics();
  const roomCoordinator =
    options.roomCoordinator === undefined
      ? config.redisUrl
        ? new RedisRoomCoordinator(config.redisUrl)
        : null
      : options.roomCoordinator;
  const releaseControl =
    options.releaseControl === undefined
      ? config.redisUrl
        ? new RedisReleaseControl(config.redisUrl)
        : null
      : options.releaseControl;
  if (config.requireDistributedCoordination && (!roomCoordinator || !releaseControl)) {
    throw new Error("Distributed realtime requires Redis room coordination and release control");
  }
  const rooms = new RoomManager(
    moduleStore,
    config.roomIdleTimeoutMs,
    config.workerScriptPath,
    roomCoordinator,
    metrics,
  );
  let controlState: "disabled" | "starting" | "ready" | "failed" = releaseControl
    ? "starting"
    : "disabled";
  const releaseControlReady = releaseControl
    ? releaseControl
        .start((event) => {
          const affected = rooms.applyReleaseStatus(event);
          if (event.status === "blocked" && affected.sessions > 0) {
            console.warn(
              JSON.stringify({
                event: "release_blocked_live",
                gameId: event.gameId,
                version: event.version,
                sessions: affected.sessions,
                connections: affected.connections,
              }),
            );
          }
        })
        .then(
          () => {
            controlState = "ready";
          },
          (error) => {
            controlState = "failed";
            throw error;
          },
        )
    : Promise.resolve();
  void releaseControlReady.catch(() => undefined);
  const metricsTimer = setInterval(() => {
    if (rooms.size === 0) return;
    console.info(
      JSON.stringify({
        event: "realtime_metrics",
        ...metrics.snapshot({
          rooms: rooms.size,
          connections: rooms.connectionCount,
          blockedReleases: rooms.blockedReleaseCount,
        }),
      }),
    );
  }, 30_000);
  metricsTimer.unref();

  const server = createServer(
    createRealtimeHttpHandler({
      config,
      rooms,
      metrics,
      distributed: Boolean(roomCoordinator),
      controlState: () => controlState,
    }),
  );
  const websocketServer = attachWebSocketGateway({
    server,
    config,
    rooms,
    replayGuard,
    releaseControlReady,
  });

  return {
    server,
    roomCount: () => rooms.size,
    listen: async () => {
      await releaseControlReady;
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => {
          server.off("error", reject);
          const address = server.address();
          if (!address || typeof address === "string")
            return reject(new Error("Gateway address unavailable"));
          resolve({ host: config.host, port: address.port });
        });
      });
    },
    close: async () => {
      clearInterval(metricsTimer);
      rooms.closeAll();
      await Promise.all([roomCoordinator?.close(), releaseControl?.close()]);
      for (const client of websocketServer.clients) client.close(1001, "server closing");
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

async function run(): Promise<void> {
  const gateway = createGateway(loadConfig());
  const address = await gateway.listen();
  console.log(`play-together-realtime listening on ${address.host}:${address.port}`);
  const stopServer = async () => {
    await gateway.close();
    process.exit(0);
  };
  process.once("SIGTERM", stopServer);
  process.once("SIGINT", stopServer);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
