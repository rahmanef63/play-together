import { EventEmitter } from "node:events";
import { createClient, type RedisClientType } from "redis";

export type RedisStatus = "wait" | "connecting" | "ready" | "end";

export interface RedisMulti {
  hset(key: string, field: string, value: string): RedisMulti;
  hdel(key: string, ...fields: string[]): RedisMulti;
  zadd(key: string, score: number, member: string): RedisMulti;
  zrem(key: string, ...members: string[]): RedisMulti;
  expire(key: string, seconds: number): RedisMulti;
  publish(channel: string, message: string): RedisMulti;
  exec(): Promise<unknown[]>;
}

export class RedisClient extends EventEmitter {
  readonly #client: RedisClientType;
  #status: RedisStatus = "wait";

  constructor(url: string) {
    super();
    this.#client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => Math.min(200 * (retries + 1), 5_000),
      },
    });
    this.on("error", (error) => {
      console.warn(
        JSON.stringify({
          event: "redis_connection_error",
          code: error instanceof Error && "code" in error ? String(error.code) : "REDIS_ERROR",
        }),
      );
    });
    this.#client.on("connect", () => {
      this.#status = "connecting";
    });
    this.#client.on("reconnecting", () => {
      this.#status = "connecting";
    });
    this.#client.on("ready", () => {
      this.#status = "ready";
      this.emit("ready");
    });
    this.#client.on("error", (error) => this.emit("error", error));
    this.#client.on("end", () => {
      this.#status = "end";
      this.emit("end");
    });
  }

  get status(): RedisStatus {
    return this.#client.isReady ? "ready" : this.#status;
  }

  async connect(): Promise<void> {
    if (this.#client.isReady) return;
    if (this.#client.isOpen) return;
    this.#status = "connecting";
    await this.#client.connect();
  }

  async quit(): Promise<string> {
    if (!this.#client.isOpen) {
      this.#status = "end";
      return "OK";
    }
    const result = await this.#client.quit();
    this.#status = "end";
    return result;
  }

  disconnect(): void {
    if (this.#client.isOpen) this.#client.destroy();
    this.#status = "end";
  }

  publish(channel: string, message: string): Promise<number> {
    return this.#client.publish(channel, message);
  }

  async subscribe(channel: string): Promise<void> {
    await this.#client.subscribe(channel, (message, subscribedChannel) => {
      this.emit("message", subscribedChannel, message);
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.#client.unsubscribe(channel);
  }

  smembers(key: string): Promise<string[]> {
    return this.#client.sMembers(key);
  }

  zadd(key: string, score: number, member: string): Promise<number> {
    return this.#client.zAdd(key, { score, value: member });
  }

  zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    return this.#client.zRangeByScore(key, min, max);
  }

  hmget(key: string, ...fields: string[]): Promise<Array<string | null>> {
    return this.#client.hmGet(key, fields);
  }

  multi(): RedisMulti {
    const multi = this.#client.multi();
    const chain: RedisMulti = {
      hset: (key, field, value) => {
        multi.hSet(key, field, value);
        return chain;
      },
      hdel: (key, ...fields) => {
        multi.hDel(key, fields);
        return chain;
      },
      zadd: (key, score, member) => {
        multi.zAdd(key, { score, value: member });
        return chain;
      },
      zrem: (key, ...members) => {
        multi.zRem(key, members);
        return chain;
      },
      expire: (key, seconds) => {
        multi.expire(key, seconds);
        return chain;
      },
      publish: (channel, message) => {
        multi.publish(channel, message);
        return chain;
      },
      exec: async () => multi.exec(),
    };
    return chain;
  }
}

export function createRedis(url: string): RedisClient {
  return new RedisClient(url);
}
