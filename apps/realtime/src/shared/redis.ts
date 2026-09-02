import { Redis } from "ioredis";

export type RedisClient = Redis;

export function createRedis(url: string): RedisClient {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    // Managed Redis proxies can stall ioredis' INFO-based ready check even after TCP/auth succeeds.
    // Application-level release control still gates gameplay until the client emits `ready`.
    enableReadyCheck: false,
    retryStrategy: (attempt) => Math.min(200 * attempt, 5_000),
  });
  client.on("error", (error) => {
    console.warn(
      JSON.stringify({
        event: "redis_connection_error",
        code: "code" in error && typeof error.code === "string" ? error.code : "REDIS_ERROR",
      }),
    );
  });
  return client;
}
