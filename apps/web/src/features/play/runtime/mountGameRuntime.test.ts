import type { ConnectionStatus } from "@play-together/browser-runtime";
import {
  DEFAULT_REMOTE_DISPLAY_POLICY,
  type ServerMessage,
  type SnapshotMessage,
} from "@play-together/contracts";
import { afterEach, expect, it, vi } from "vitest";
import { mountGameRuntime } from "./mountGameRuntime";

const runtime = vi.hoisted(() => ({
  connection: (_status: ConnectionStatus) => {},
  message: (_message: ServerMessage) => {},
  snapshot: (_snapshot: SnapshotMessage) => {},
  frameMessage: (_event: MessageEvent) => {},
  stall: (_message: string) => {},
  frame: { contentWindow: { postMessage: vi.fn() }, remove: vi.fn() },
}));

vi.mock("@play-together/browser-runtime", () => ({
  RealtimeClient: class {
    start() {}
    stop() {}
    onStatus(listener: typeof runtime.connection) {
      runtime.connection = listener;
    }
    onMessage(listener: typeof runtime.message) {
      runtime.message = listener;
      return () => {};
    }
    subscribe(listener: typeof runtime.snapshot) {
      runtime.snapshot = listener;
      return () => {};
    }
  },
}));
vi.mock("../../../shared/browserSupport", () => ({ secureChannelId: () => "channel" }));
vi.mock("../../../shared/realtimeEndpoint", () => ({ realtimeUrl: "ws://localhost" }));
vi.mock("./frameProtocol", async (original) => ({
  ...(await original<typeof import("./frameProtocol")>()),
  createGameFrame: () => runtime.frame,
}));
vi.mock("./runtimeLiveness", () => ({
  mountRuntimeLiveness: () => ({ connection: vi.fn(), snapshot: vi.fn(), dispose: vi.fn() }),
}));
vi.mock("./frameBootstrap", () => ({
  mountFrameBootstrap: (options: { onStall: typeof runtime.stall }) => {
    runtime.stall = options.onStall;
    return { dispose: vi.fn(), ready: vi.fn(), recovering: vi.fn() };
  },
}));

afterEach(() => vi.unstubAllGlobals());

it("clears recovered realtime and renderer errors independently", async () => {
  vi.stubGlobal("window", {
    addEventListener: (_type: string, listener: typeof runtime.frameMessage) => {
      runtime.frameMessage = listener;
    },
    removeEventListener: vi.fn(),
  });
  const onError = vi.fn();
  const dispose = mountGameRuntime({
    code: "ROOM12",
    role: "controller",
    mode: "remote",
    roomTitle: "Game",
    presentationPolicy: DEFAULT_REMOTE_DISPLAY_POLICY,
    mount: { replaceChildren: vi.fn() } as unknown as HTMLElement,
    issueTicket: async () => ({ playerId: "p1", ticket: "token", expiresAt: 1000 }),
    onConnection: vi.fn(),
    onError,
    onRemotePlan: vi.fn(),
    onStatus: vi.fn(),
    onSystemMenu: vi.fn(),
  });
  await Promise.resolve();
  const snapshot: SnapshotMessage = { type: "snapshot", tick: 1, serverTime: 1, state: {} };
  const failConnection = () =>
    runtime.message({
      type: "error",
      code: "GAME_RUNTIME_FAILED",
      message: "Worker failed",
      fatal: true,
    });
  const frameMessage = (type: string, message?: string) =>
    runtime.frameMessage({
      source: runtime.frame.contentWindow,
      data: { type, channel: "channel", message },
    } as unknown as MessageEvent);

  failConnection();
  expect(onError).toHaveBeenLastCalledWith("Worker failed");
  runtime.connection("reconnecting");
  runtime.connection("connected");
  expect(onError).toHaveBeenLastCalledWith("Worker failed");
  runtime.snapshot(snapshot);
  expect(onError).toHaveBeenLastCalledWith("");

  frameMessage("error", "Renderer failed");
  failConnection();
  runtime.snapshot(snapshot);
  expect(onError).toHaveBeenLastCalledWith("Renderer failed");
  frameMessage("ready");
  expect(onError).toHaveBeenLastCalledWith("");

  runtime.stall("Renderer stalled");
  failConnection();
  frameMessage("ready");
  expect(onError).toHaveBeenLastCalledWith("Worker failed");
  runtime.snapshot(snapshot);
  expect(onError).toHaveBeenLastCalledWith("");
  dispose();
});
