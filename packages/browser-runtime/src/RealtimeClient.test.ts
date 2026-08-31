import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "./RealtimeClient.js";
import { CONNECT_TIMEOUT_MS, type ConnectionStatus } from "./realtimeProtocol.js";

class MockWebSocket extends EventTarget {
  static instances: MockWebSocket[] = [];
  readyState = 0;
  closed = false;

  constructor() {
    super();
    MockWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  send() {}

  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }
}

describe("RealtimeClient connection watchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries a websocket handshake that never opens", async () => {
    const statuses: ConnectionStatus[] = [];
    const refreshTicket = vi.fn(async () => ({
      token: "ticket-2",
      expiresAt: Date.now() + 60_000,
    }));
    const client = new RealtimeClient({
      baseUrl: "wss://realtime.test/v1/connect",
      initialTicket: { token: "ticket-1", expiresAt: Date.now() + 60_000 },
      refreshTicket,
      reconnect: true,
      WebSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });
    client.onStatus((status) => statuses.push(status));

    client.start();
    expect(client.status).toBe("connecting");
    expect(MockWebSocket.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS + 601);
    expect(MockWebSocket.instances[0]?.closed).toBe(true);
    expect(refreshTicket).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(2);

    MockWebSocket.instances[1]?.open();
    expect(client.status).toBe("connected");
    expect(statuses).toContain("reconnecting");
    client.stop();
  });
});
