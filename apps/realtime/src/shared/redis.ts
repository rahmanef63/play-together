import { Redis } from "ioredis";

export type RedisClient = Redis;

export function createRedis(url: string): RedisClient {
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (attempt) => Math.min(200 * attempt, 5_000),
  });
}
