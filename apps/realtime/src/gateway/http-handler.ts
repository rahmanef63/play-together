import type { RequestListener } from "node:http";
import type { GatewayConfig } from "../config.js";
import type { RealtimeMetrics } from "../features/observability/realtime-metrics.js";
import type { RoomManager } from "../features/rooms/room-manager.js";

interface RealtimeHttpOptions {
  config: GatewayConfig;
  rooms: RoomManager;
  metrics: RealtimeMetrics;
  distributed: boolean;
  controlState: () => "disabled" | "starting" | "ready" | "failed";
}

export function createRealtimeHttpHandler(options: RealtimeHttpOptions): RequestListener {
  return (request, response) => {
    const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
      .pathname;
    const releaseControl = options.controlState();
    const ready = releaseControl === "disabled" || releaseControl === "ready";
    const payload = {
      ok: ready,
      service: "play-together-realtime",
      protocolVersion: 1,
      rooms: options.rooms.size,
      coordination: options.distributed ? "distributed" : "local",
      releaseControl,
      blockedReleases: options.rooms.blockedReleaseCount,
      observability: options.metrics.snapshot({
        rooms: options.rooms.size,
        connections: options.rooms.connectionCount,
        blockedReleases: options.rooms.blockedReleaseCount,
      }),
    };
    const origin = request.headers.origin;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "cache-control": "no-store",
    };
    if (origin && options.config.allowedOrigins.has(origin)) {
      headers["access-control-allow-origin"] = origin;
      headers.vary = "Origin";
    }
    response.writeHead(
      pathname === "/healthz" || pathname === "/readyz" ? (ready ? 200 : 503) : 200,
      headers,
    );
    response.end(JSON.stringify(payload));
  };
}
