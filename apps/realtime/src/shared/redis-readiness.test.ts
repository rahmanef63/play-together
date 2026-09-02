import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { waitForRedisReady } from "./redis-readiness.js";

type FakeStatus = "wait" | "connecting" | "reconnecting" | "ready" | "end";

class FakeRedis extends EventEmitter {
  status: FakeStatus = "wait";
  connect = vi.fn(async () => {
    this.status = "reconnecting";
    throw new Error("first handshake timed out");
  });
}

describe("waitForRedisReady", () => {
  it("survives an initial connect rejection when the client later becomes ready", async () => {
    const client = new FakeRedis();
    const ready = waitForRedisReady(client as never, 1_000);
    await vi.waitFor(() => expect(client.status).toBe("reconnecting"));
    client.status = "ready";
    client.emit("ready");
    await expect(ready).resolves.toBeUndefined();
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it("returns immediately for an already-ready client", async () => {
    const client = new FakeRedis();
    client.status = "ready";
    await expect(waitForRedisReady(client as never, 50)).resolves.toBeUndefined();
    expect(client.connect).not.toHaveBeenCalled();
  });

  it("fails closed when the client never becomes ready", async () => {
    const client = new FakeRedis();
    await expect(waitForRedisReady(client as never, 25)).rejects.toThrow(
      /handshake timed out|ready/,
    );
  });
});
