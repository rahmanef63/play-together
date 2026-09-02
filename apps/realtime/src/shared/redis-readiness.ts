import type { RedisClient } from "./redis.js";

const DEFAULT_READY_TIMEOUT_MS = 20_000;

export async function waitForRedisReady(
  client: RedisClient,
  timeoutMs = DEFAULT_READY_TIMEOUT_MS,
): Promise<void> {
  if (client.status === "ready") return;
  if (client.status === "end") throw new Error("Redis client is closed");

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let lastError: unknown;

    const cleanup = () => {
      clearTimeout(timer);
      client.off("ready", onReady);
      client.off("error", onError);
      client.off("end", onEnd);
    };
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onReady = () => finish();
    const onError = (error: unknown) => {
      lastError = error;
    };
    const onEnd = () => finish(lastError ?? new Error("Redis connection ended before ready"));
    const timer = setTimeout(
      () => finish(lastError ?? new Error(`Redis did not become ready within ${timeoutMs}ms`)),
      timeoutMs,
    );
    timer.unref?.();

    client.on("ready", onReady);
    client.on("error", onError);
    client.on("end", onEnd);

    if (client.status === "ready") {
      finish();
      return;
    }
    if (client.status === "wait") {
      // A managed Redis client may reject an initial connect attempt while its
      // reconnect policy continues asynchronously. Readiness is event-owned.
      void client.connect().catch((error) => {
        lastError = error;
      });
    }
  });
}
