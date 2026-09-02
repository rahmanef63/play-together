import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { monitorWebSocketLiveness } from "./websocket-liveness.js";

class FakeSocket extends EventEmitter {
  readonly OPEN = 1;
  readyState = this.OPEN;
  pings = 0;
  terminated = false;
  ping() {
    this.pings += 1;
  }
  terminate() {
    this.terminated = true;
    this.readyState = 3;
  }
}

describe("websocket liveness", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("terminates a socket that misses a protocol pong", () => {
    const socket = new FakeSocket();
    monitorWebSocketLiveness(socket as never, 100);
    vi.advanceTimersByTime(100);
    expect(socket.pings).toBe(1);
    vi.advanceTimersByTime(100);
    expect(socket.terminated).toBe(true);
  });

  it("keeps a socket alive when pong arrives", () => {
    const socket = new FakeSocket();
    const stop = monitorWebSocketLiveness(socket as never, 100);
    vi.advanceTimersByTime(100);
    socket.emit("pong");
    vi.advanceTimersByTime(100);
    expect(socket.pings).toBe(2);
    expect(socket.terminated).toBe(false);
    stop();
  });
});
