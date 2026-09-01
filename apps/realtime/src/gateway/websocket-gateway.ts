import type { IncomingMessage, Server } from "node:http";
import { clientMessageSchema, type TicketClaims } from "@play-together/contracts";
import { verifyTicket } from "@play-together/security";
import { type WebSocket, WebSocketServer } from "ws";
import type { GatewayConfig } from "../config.js";
import { RELEASE_BLOCK_RESPONSE } from "../features/releases/release-block-response.js";
import { ReleaseBlockedError } from "../features/releases/release-control.js";
import type { RoomManager } from "../features/rooms/room-manager.js";
import type { TicketReplayGuard } from "../features/tickets/replay-guard.js";

interface WebSocketGatewayOptions {
  server: Server;
  config: GatewayConfig;
  rooms: RoomManager;
  replayGuard: TicketReplayGuard;
  releaseControlReady: Promise<void>;
}

export function attachWebSocketGateway(options: WebSocketGatewayOptions): WebSocketServer {
  const { server, config, rooms, replayGuard, releaseControlReady } = options;
  const websocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: config.maxPayloadBytes,
    perMessageDeflate: false,
    clientTracking: true,
    handleProtocols(protocols) {
      return protocols.has("play-together.v1") ? "play-together.v1" : false;
    },
  });

  server.on("upgrade", (request, socket, head) => {
    void releaseControlReady
      .then(() => upgrade(request, socket, head, websocketServer, config, replayGuard))
      .catch(() => rejectUpgrade(socket, "503 Service Unavailable"));
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
        const blocked = error instanceof ReleaseBlockedError;
        socket.send(
          JSON.stringify(
            blocked
              ? RELEASE_BLOCK_RESPONSE.message
              : {
                  type: "error",
                  code: "ROOM_START_FAILED",
                  message: error instanceof Error ? error.message : "Room could not start",
                  fatal: true,
                },
          ),
        );
        socket.close(
          blocked ? RELEASE_BLOCK_RESPONSE.closeCode : 1011,
          blocked ? RELEASE_BLOCK_RESPONSE.closeReason : "room start failed",
        );
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
  return websocketServer;
}

async function upgrade(
  request: IncomingMessage,
  socket: import("node:stream").Duplex,
  head: Buffer,
  websocketServer: WebSocketServer,
  config: GatewayConfig,
  replayGuard: TicketReplayGuard,
): Promise<void> {
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
    rejectUpgrade(socket, "401 Unauthorized");
  }
}

function rejectUpgrade(socket: import("node:stream").Duplex, status: string): void {
  if (socket.destroyed) return;
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}
