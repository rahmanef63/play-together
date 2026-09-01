import {
  BLOCKED_RELEASES_KEY,
  parseReleaseIdentity,
  RELEASE_CONTROL_CHANNEL,
  type ReleaseControlEvent,
  releaseControlEventSchema,
} from "@play-together/contracts";
import { createRedis, type RedisClient } from "../../shared/redis.js";
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
    await Promise.all([this.#commands.connect(), this.#subscriber.connect()]);
    this.#subscriber.on("message", (channel, encoded) => {
      if (
        channel !== RELEASE_CONTROL_CHANNEL ||
        Buffer.byteLength(encoded) > MAX_CONTROL_EVENT_BYTES
      )
        return;
      const event = parseEvent(encoded);
      if (event) listener(event);
    });
    await this.#subscriber.subscribe(RELEASE_CONTROL_CHANNEL);
    this.#started = true;

    const blocked = await this.#commands.smembers(BLOCKED_RELEASES_KEY);
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
