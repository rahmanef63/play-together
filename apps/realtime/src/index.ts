import { createServer, type IncomingMessage, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { clientMessageSchema, type TicketClaims } from "@play-together/contracts";
import { verifyTicket } from "@play-together/security";
import { type WebSocket, WebSocketServer } from "ws";
import { type GatewayConfig, loadConfig } from "./config.js";
import { GameModuleStore } from "./features/modules/module-store.js";
import { RedisRoomCoordinator } from "./features/rooms/redis-room-coordinator.js";
import type { RoomCoordinator } from "./features/rooms/room-coordinator.js";
import { RoomManager } from "./features/rooms/room-manager.js";
import { TicketReplayGuard } from "./features/tickets/replay-guard.js";

export interface GatewayOptions {
  roomCoordinator?: RoomCoordinator | null;
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
  const roomCoordinator =
    options.roomCoordinator === undefined
      ? config.redisUrl
        ? new RedisRoomCoordinator(config.redisUrl)
        : null
      : options.roomCoordinator;
  if (config.requireDistributedCoordination && !roomCoordinator) {
    throw new Error("Distributed room coordination is required but no coordinator is configured");
  }
  const rooms = new RoomManager(
    moduleStore,
    config.roomIdleTimeoutMs,
    config.workerScriptPath,
    roomCoordinator,
  );
  const websocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: config.maxPayloadBytes,
    perMessageDeflate: false,
    clientTracking: true,
    handleProtocols(protocols) {
      return protocols.has("play-together.v1") ? "play-together.v1" : false;
    },
  });
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
      .pathname;
    if (pathname === "/healthz" || pathname === "/readyz") {
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "play-together-realtime",
        protocolVersion: 1,
        rooms: rooms.size,
        coordination: roomCoordinator ? "distributed" : "local",
      }),
    );
  });

  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      if (url.pathname !== config.connectPath) throw new Error("Unknown WebSocket endpoint");
      const origin = request.headers.origin;
      if (!origin && !config.allowMissingOrigin) throw new Error("Origin header required");
      if (origin && !config.allowedOrigins.has(origin)) throw new Error("Origin not allowed");
      const offeredProtocols = String(request.headers["sec-websocket-protocol"] ?? "")
        .split(",")
        .map((value) => value.trim());
      if (!offeredProtocols.includes("play-together.v1")) throw new Error("Protocol not supported");
      const encodedTicket = offeredProtocols.find((value) => value.startsWith("ptt."));
      const ticket = encodedTicket?.slice(4);
      if (!ticket || ticket.length > 8_192) throw new Error("Ticket required");
      const claims = verifyTicket(ticket, config.ticketSecret);
      if (!replayGuard.consume(claims.jti, claims.exp)) throw new Error("Ticket already used");
      websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit("connection", websocket, request, claims);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
    }
  });

  websocketServer.on(
    "connection",
    async (socket: WebSocket, _request: IncomingMessage, claims: TicketClaims) => {
      const ticketLifetime = Math.max(1, claims.exp * 1_000 - Date.now());
      const expirationTimer = setTimeout(
        () => socket.close(4001, "ticket expired"),
        ticketLifetime,
      );
      expirationTimer.unref();
      socket.once("close", () => clearTimeout(expirationTimer));
      let session: Awaited<ReturnType<RoomManager["add"]>>["session"] | null = null;
      let connectionId: string | null = null;
      try {
        const joined = await rooms.add(socket, claims);
        session = joined.session;
        connectionId = joined.connectionId;
      } catch (error) {
        socket.send(
          JSON.stringify({
            type: "error",
            code: "ROOM_START_FAILED",
            message: error instanceof Error ? error.message : "Room could not start",
            fatal: true,
          }),
        );
        socket.close(1011, "room start failed");
        return;
      }
      socket.on("message", (data, isBinary) => {
        if (isBinary || !session || !connectionId) {
          socket.close(1003, "text messages only");
          return;
        }
        try {
          const message = clientMessageSchema.parse(JSON.parse(data.toString("utf8")));
          session.handle(connectionId, message);
        } catch {
          socket.send(
            JSON.stringify({
              type: "error",
              code: "BAD_MESSAGE",
              message: "Invalid protocol message",
              fatal: false,
            }),
          );
        }
      });
      socket.once("close", () => {
        if (session && connectionId) session.remove(connectionId);
      });
    },
  );

  return {
    server,
    roomCount: () => rooms.size,
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => {
          server.off("error", reject);
          const address = server.address();
          if (!address || typeof address === "string")
            return reject(new Error("Gateway address unavailable"));
          resolve({ host: config.host, port: address.port });
        });
      }),
    close: async () => {
      rooms.closeAll();
      await roomCoordinator?.close();
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
