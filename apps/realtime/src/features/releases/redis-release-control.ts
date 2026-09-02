import {
  BLOCKED_RELEASES_KEY,
  parseReleaseIdentity,
  RELEASE_CONTROL_CHANNEL,
  type ReleaseControlEvent,
  releaseControlEventSchema,
} from "@play-together/contracts";
import { createRedis, type RedisClient } from "../../shared/redis.js";
import { waitForRedisReady } from "../../shared/redis-readiness.js";
import type { ReleaseControl, ReleaseControlListener } from "./release-control.js";

const MAX_CONTROL_EVENT_BYTES = 2_048;

export class RedisReleaseControl implements ReleaseControl {
  readonly #commands: RedisClient;
  readonly #subscriber: RedisClient;
  #started = false;
  #closed = false;

  constructor(url: string) {
    this.#commands = createRedis(url);
    this.#subscriber = createRedis(url);
  }

  async start(listener: ReleaseControlListener): Promise<void> {
    if (this.#closed) throw new Error("Release control is closed");
    if (this.#started) return;
    // Connect sequentially so a cold serverless instance does not burst two
    // new managed-Redis handshakes at the same instant.
    await releaseControlStage("commands-ready", () => waitForRedisReady(this.#commands));
    await releaseControlStage("subscriber-ready", () => waitForRedisReady(this.#subscriber));
    this.#subscriber.on("message", (channel, encoded) => {
      if (
        channel !== RELEASE_CONTROL_CHANNEL ||
        Buffer.byteLength(encoded) > MAX_CONTROL_EVENT_BYTES
      )
        return;
      const event = parseEvent(encoded);
      if (event) listener(event);
    });
    await releaseControlStage("subscribe", () =>
      this.#subscriber.subscribe(RELEASE_CONTROL_CHANNEL),
    );
    this.#started = true;

    const blocked = await releaseControlStage("blocked-read", () =>
      this.#commands.smembers(BLOCKED_RELEASES_KEY),
    );
    const changedAt = Date.now();
    for (const encoded of blocked) {
      const identity = parseReleaseIdentity(encoded);
      if (identity) listener({ type: "release-status", ...identity, status: "blocked", changedAt });
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#started)
      await this.#subscriber.unsubscribe(RELEASE_CONTROL_CHANNEL).catch(() => undefined);
    await Promise.all([closeRedis(this.#subscriber), closeRedis(this.#commands)]);
  }
}

async function releaseControlStage<T>(stage: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "redis_release_control_start_failed",
        stage,
        name: error instanceof Error ? error.name : "Error",
        code: error instanceof Error && "code" in error ? String(error.code) : null,
      }),
    );
    throw new RedisReleaseControlStartError(stage, error);
  }
}

export class RedisReleaseControlStartError extends Error {
  readonly stage: string;

  constructor(stage: string, cause: unknown) {
    super("Redis release control startup failed", { cause });
    this.name = "RedisReleaseControlStartError";
    this.stage = stage;
  }
}

function parseEvent(encoded: string): ReleaseControlEvent | null {
  try {
    const parsed = releaseControlEventSchema.safeParse(JSON.parse(encoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function closeRedis(client: RedisClient): Promise<void> {
  if (client.status === "wait" || client.status === "end") return;
  await client.quit().catch(() => client.disconnect());
}
