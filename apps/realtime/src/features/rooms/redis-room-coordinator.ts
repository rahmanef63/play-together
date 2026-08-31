import { createHash, randomUUID } from "node:crypto";
import Redis from "ioredis";
import type {
  CoordinatedInput,
  CoordinatedPresencePlayer,
  CoordinatedSnapshot,
  RoomCoordinator,
  RoomCoordinatorCallbacks,
  RoomCoordinatorHandle,
} from "./room-coordinator.js";

const PRESENCE_STALE_MS = 45_000;
const PRESENCE_REFRESH_MS = 10_000;
const KEY_TTL_SECONDS = 60 * 60;
const MAX_EVENT_BYTES = 256 * 1024;

type RedisRoomEvent =
  | { type: "presence" }
  | { type: "input"; input: CoordinatedInput }
  | { type: "snapshot"; snapshot: CoordinatedSnapshot };

export class RedisRoomCoordinator implements RoomCoordinator {
  readonly #url: string;
  readonly #publisher: Redis;
  readonly #instanceId = randomUUID();
  #connectPromise: Promise<void> | null = null;

  constructor(url: string) {
    this.#url = url;
    this.#publisher = createRedis(url);
  }

  async attach(
    roomKey: string,
    callbacks: RoomCoordinatorCallbacks,
  ): Promise<RoomCoordinatorHandle> {
    if (this.#publisher.status !== "ready") {
      this.#connectPromise ??= this.#publisher.connect().finally(() => {
        this.#connectPromise = null;
      });
      await this.#connectPromise;
    }
    return new RedisRoomHandle(this.#url, this.#publisher, this.#instanceId, roomKey, callbacks);
  }

  async close(): Promise<void> {
    if (this.#publisher.status === "wait" || this.#publisher.status === "end") return;
    await this.#publisher.quit().catch(() => this.#publisher.disconnect());
  }
}

class RedisRoomHandle implements RoomCoordinatorHandle {
  readonly instanceId: string;
  readonly #publisher: Redis;
  readonly #callbacks: RoomCoordinatorCallbacks;
  readonly #subscriber: Redis;
  readonly #connectionsKey: string;
  readonly #presenceKey: string;
  readonly #channel: string;
  readonly #ownedConnections = new Set<string>();
  #refreshTimer: ReturnType<typeof setInterval> | null = null;
  #started = false;
  #closed = false;

  constructor(
    url: string,
    publisher: Redis,
    instanceId: string,
    roomKey: string,
    callbacks: RoomCoordinatorCallbacks,
  ) {
    this.#publisher = publisher;
    this.instanceId = instanceId;
    this.#callbacks = callbacks;
    const digest = createHash("sha256").update(roomKey).digest("hex").slice(0, 32);
    const keyPrefix = `pt:v1:room:${digest}`;
    this.#connectionsKey = `${keyPrefix}:connections`;
    this.#presenceKey = `${keyPrefix}:presence`;
    this.#channel = `${keyPrefix}:events`;
    this.#subscriber = createRedis(url);
  }

  async start(): Promise<void> {
    if (this.#closed || this.#started) return;
    await this.#subscriber.connect();
    this.#subscriber.on("message", (channel, encoded) => {
      if (channel !== this.#channel || Buffer.byteLength(encoded) > MAX_EVENT_BYTES) return;
      const event = parseEvent(encoded);
      if (!event) return;
      if (event.type === "presence") void this.#refreshPresence();
      else if (event.type === "input") this.#callbacks.onInput(event.input);
      else this.#callbacks.onSnapshot(event.snapshot);
    });
    await this.#subscriber.subscribe(this.#channel);
    this.#started = true;
    await this.#refreshPresence();
    this.#refreshTimer = setInterval(() => void this.#refreshPresence(), PRESENCE_REFRESH_MS);
    this.#refreshTimer.unref();
  }

  async register(player: Omit<CoordinatedPresencePlayer, "instanceId">): Promise<void> {
    if (this.#closed) throw new Error("Room coordinator handle is closed");
    const fullPlayer: CoordinatedPresencePlayer = { ...player, instanceId: this.instanceId };
    this.#ownedConnections.add(player.connectionId);
    await this.#publisher
      .multi()
      .hset(this.#connectionsKey, player.connectionId, JSON.stringify(fullPlayer))
      .zadd(this.#presenceKey, Date.now(), player.connectionId)
      .expire(this.#connectionsKey, KEY_TTL_SECONDS)
      .expire(this.#presenceKey, KEY_TTL_SECONDS)
      .publish(this.#channel, JSON.stringify({ type: "presence" } satisfies RedisRoomEvent))
      .exec();
  }

  async heartbeat(connectionId: string): Promise<void> {
    if (this.#closed || !this.#ownedConnections.has(connectionId)) return;
    await this.#publisher.zadd(this.#presenceKey, Date.now(), connectionId);
  }

  async unregister(connectionId: string): Promise<void> {
    this.#ownedConnections.delete(connectionId);
    if (this.#closed) return;
    await this.#publisher
      .multi()
      .hdel(this.#connectionsKey, connectionId)
      .zrem(this.#presenceKey, connectionId)
      .publish(this.#channel, JSON.stringify({ type: "presence" } satisfies RedisRoomEvent))
      .exec();
  }

  async publishInput(input: CoordinatedInput): Promise<void> {
    if (this.#closed) return;
    await this.#publish({ type: "input", input });
  }

  async publishSnapshot(snapshot: CoordinatedSnapshot): Promise<void> {
    if (this.#closed) return;
    await this.#publish({ type: "snapshot", snapshot });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    if (this.#refreshTimer) clearInterval(this.#refreshTimer);
    this.#refreshTimer = null;
    const owned = [...this.#ownedConnections];
    this.#ownedConnections.clear();
    if (owned.length > 0) {
      await this.#publisher
        .multi()
        .hdel(this.#connectionsKey, ...owned)
        .zrem(this.#presenceKey, ...owned)
        .publish(this.#channel, JSON.stringify({ type: "presence" } satisfies RedisRoomEvent))
        .exec()
        .catch(() => undefined);
    }
    this.#closed = true;
    if (this.#started) await this.#subscriber.unsubscribe(this.#channel).catch(() => undefined);
    await this.#subscriber.quit().catch(() => this.#subscriber.disconnect());
  }

  async #publish(event: RedisRoomEvent): Promise<void> {
    const encoded = JSON.stringify(event);
    if (Buffer.byteLength(encoded) > MAX_EVENT_BYTES) {
      throw new Error("Coordinated room event exceeds 256 KiB");
    }
    await this.#publisher.publish(this.#channel, encoded);
  }

  async #refreshPresence(): Promise<void> {
    if (this.#closed) return;
    const cutoff = Date.now() - PRESENCE_STALE_MS;
    const stale = await this.#publisher.zrangebyscore(this.#presenceKey, "-inf", cutoff);
    if (stale.length > 0) {
      await this.#publisher
        .multi()
        .hdel(this.#connectionsKey, ...stale)
        .zrem(this.#presenceKey, ...stale)
        .exec();
    }
    const activeIds = await this.#publisher.zrangebyscore(this.#presenceKey, cutoff + 1, "+inf");
    if (activeIds.length === 0) {
      this.#callbacks.onPresence([]);
      return;
    }
    const raw = await this.#publisher.hmget(this.#connectionsKey, ...activeIds);
    const players: CoordinatedPresencePlayer[] = [];
    for (const encoded of raw) {
      if (!encoded) continue;
      const player = parsePresence(encoded);
      if (player) players.push(player);
    }
    players.sort(
      (left, right) =>
        left.connectedAt - right.connectedAt || left.connectionId.localeCompare(right.connectionId),
    );
    this.#callbacks.onPresence(players);
  }
}

function createRedis(url: string): Redis {
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (attempt) => Math.min(200 * attempt, 5_000),
  });
}

function parsePresence(encoded: string): CoordinatedPresencePlayer | null {
  try {
    const value = JSON.parse(encoded) as Partial<CoordinatedPresencePlayer>;
    if (
      typeof value.connectionId !== "string" ||
      typeof value.instanceId !== "string" ||
      typeof value.playerId !== "string" ||
      (value.role !== "controller" && value.role !== "display") ||
      (value.mode !== "remote" && value.mode !== "handheld") ||
      typeof value.connectedAt !== "number"
    ) {
      return null;
    }
    return value as CoordinatedPresencePlayer;
  } catch {
    return null;
  }
}

function parseEvent(encoded: string): RedisRoomEvent | null {
  try {
    const value = JSON.parse(encoded) as RedisRoomEvent;
    if (value.type === "presence") return value;
    if (value.type === "input" && value.input && typeof value.input.playerId === "string")
      return value;
    if (value.type === "snapshot" && value.snapshot && Number.isFinite(value.snapshot.tick))
      return value;
    return null;
  } catch {
    return null;
  }
}
