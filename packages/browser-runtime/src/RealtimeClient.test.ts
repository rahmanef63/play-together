import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "./RealtimeClient.js";
import { HEARTBEAT_PONG_TIMEOUT_MS } from "./realtimeHeartbeat.js";
import { CONNECT_TIMEOUT_MS, type ConnectionStatus } from "./realtimeProtocol.js";

class MockWebSocket extends EventTarget {
  static instances: MockWebSocket[] = [];
  readyState = 0;
  closed = false;
  sent: string[] = [];

  constructor() {
    super();
    MockWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  send(data: string) {
    this.sent.push(data);
  }

  receive(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data) }));
  }

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

  it("warms telemetry after the first pong instead of waiting 15 seconds", () => {
    const telemetry = vi.fn((rttMs: number | null) => ({
      frameP95Ms: 17,
      frameMaxMs: 22,
      frameSamples: 12,
      ...(rttMs === null ? {} : { rttMs }),
    }));
    const client = new RealtimeClient({
      baseUrl: "wss://realtime.test/v1/connect",
      initialTicket: { token: "ticket-1", expiresAt: Date.now() + 60_000 },
      reconnect: false,
      telemetry,
      WebSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });

    client.start();
    const socket = MockWebSocket.instances[0];
    socket?.open();
    expect(socket?.sent).toHaveLength(0);
    socket?.receive({
      type: "welcome",
      connectionId: "c1",
      playerId: "p1",
      roomId: "r1",
      roomCode: "ROOM01",
      role: "display",
      mode: "remote",
      gameId: "pong",
      gameVersion: "0.4.0",
      protocolVersion: 1,
    });
    const ping = JSON.parse(socket?.sent[0] ?? "{}");
    expect(ping).toMatchObject({ type: "heartbeat" });
    expect(ping.telemetry).toBeUndefined();

    socket?.receive({ type: "pong", sentAt: ping.sentAt, serverTime: Date.now() });
    vi.advanceTimersByTime(1_000);
    const warmSample = JSON.parse(socket?.sent[1] ?? "{}");
    expect(warmSample.type).toBe("heartbeat");
    expect(warmSample.telemetry).toMatchObject({ frameP95Ms: 17, frameSamples: 12 });
    expect(typeof warmSample.telemetry.rttMs).toBe("number");
    expect(telemetry).toHaveBeenCalledTimes(1);
    client.stop();
  });

  it("reconnects a half-open websocket when pong stops", async () => {
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

    client.start();
    const first = MockWebSocket.instances[0];
    first?.open();
    first?.receive({
      type: "welcome",
      connectionId: "c1",
      playerId: "p1",
      roomId: "r1",
      roomCode: "ROOM01",
      role: "controller",
      mode: "remote",
      gameId: "pong",
      gameVersion: "0.4.0",
      protocolVersion: 1,
    });
    expect(client.status).toBe("connected");
    expect(JSON.parse(first?.sent[0] ?? "{}").type).toBe("heartbeat");

    await vi.advanceTimersByTimeAsync(HEARTBEAT_PONG_TIMEOUT_MS + 1);
    expect(first?.closed).toBe(true);
    expect(client.status).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(1);
    expect(refreshTicket).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(2);
    client.stop();
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
