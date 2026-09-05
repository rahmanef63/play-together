import { type ConnectionStatus, RealtimeClient } from "@play-together/browser-runtime";
import type { ControllerMode, RemoteDisplayPolicy } from "@play-together/contracts";
import { secureChannelId } from "../../../shared/browserSupport";
import { realtimeUrl } from "../../../shared/realtimeEndpoint";
import type { TicketResponse } from "../../../shared/types";
import {
  createRemoteDisplayPlan,
  type PresencePlayer,
  type RemoteDisplayLayout,
  type RemoteRole,
  remoteControllers,
} from "../remotePresentation";
import { FramePerformanceSampler } from "./framePerformanceSampler";
import { createGameFrame, isFrameMessage } from "./frameProtocol";
import { mountRuntimeLiveness } from "./runtimeLiveness";

interface RuntimeCallbacks {
  onConnection: (status: ConnectionStatus) => void;
  onError: (message: string) => void;
  onRemotePlan: (count: number, layout: RemoteDisplayLayout) => void;
  onStatus: (message: string) => void;
}

interface RuntimeOptions extends RuntimeCallbacks {
  code: string;
  mode: ControllerMode;
  mount: HTMLElement;
  role: RemoteRole;
  roomTitle: string;
  presentationPolicy: RemoteDisplayPolicy;
  issueTicket: (args: { code: string; role: RemoteRole; mode: ControllerMode }) => Promise<unknown>;
}

export function mountGameRuntime(options: RuntimeOptions): () => void {
  let disposed = false;
  let client: RealtimeClient | null = null;
  let unsubscribeSnapshot: (() => void) | null = null;
  let unsubscribeMessages: (() => void) | null = null;
  let disposeLiveness: (() => void) | null = null;
  let gameTitle = options.roomTitle || "Game";
  let latestPresence: PresencePlayer[] = [];
  let currentPlayerId = "";
  const presentationPolicy = options.presentationPolicy;
  const channel = secureChannelId();
  const frame = createGameFrame(options.role, options.mode, channel);
  const performanceSampler =
    options.role === "display" || options.mode === "handheld"
      ? new FramePerformanceSampler()
      : null;

  const pushPresentation = () => {
    if (options.role !== "display") return;
    const controllers = remoteControllers(latestPresence);
    const plan = createRemoteDisplayPlan({
      players: latestPresence,
      fallbackPlayerId: currentPlayerId,
      policy: presentationPolicy,
    });
    options.onRemotePlan(controllers.length, plan.layout);
    options.onStatus(
      `${gameTitle} · ${controllers.length} controller${controllers.length === 1 ? "" : "s"} · ${plan.layout === "split" ? `${controllers.length}-way split` : "shared view"}`,
    );
    frame.contentWindow?.postMessage(
      {
        type: "presentation",
        channel,
        layout: plan.layout,
        views: plan.playerIds.map((playerId, index) => ({
          playerId,
          label: `Player ${index + 1}`,
        })),
      },
      "*",
    );
  };

  const onFrameMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== frame.contentWindow || !isFrameMessage(event.data, channel)) return;
    const message = event.data;
    if (message.type === "input") client?.sendInput(message.payload);
    else if (
      message.type === "status" &&
      typeof message.status === "string" &&
      options.role !== "display"
    )
      options.onStatus(message.status);
    else if (message.type === "ready") {
      gameTitle = typeof message.title === "string" ? message.title : gameTitle;
      if (options.role === "display") pushPresentation();
      else
        options.onStatus(
          `${gameTitle} · ${options.mode === "handheld" ? "handheld console" : "phone remote"}`,
        );
      if (client?.latestSnapshot)
        frame.contentWindow?.postMessage(
          { type: "snapshot", channel, snapshot: client.latestSnapshot },
          "*",
        );
    } else if (message.type === "error")
      options.onError(
        typeof message.message === "string" ? message.message : "Game surface failed",
      );
  };
  window.addEventListener("message", onFrameMessage);

  void connect();
  return () => {
    disposed = true;
    unsubscribeSnapshot?.();
    unsubscribeMessages?.();
    client?.stop();
    performanceSampler?.stop();
    disposeLiveness?.();
    window.removeEventListener("message", onFrameMessage);
    frame.remove();
    options.onConnection("idle");
  };

  async function connect() {
    try {
      options.onError("");
      options.onStatus(`${gameTitle} · connecting…`);
      const initial = (await options.issueTicket({
        code: options.code,
        role: options.role,
        mode: options.mode,
      })) as TicketResponse;
      currentPlayerId = initial.playerId;
      if (disposed) return;
      const refreshTicket = async () => {
        const refreshed = (await options.issueTicket({
          code: options.code,
          role: options.role,
          mode: options.mode,
        })) as TicketResponse;
        if (
          refreshed.gameId !== initial.gameId ||
          refreshed.gameVersion !== initial.gameVersion ||
          refreshed.manifestSha256 !== initial.manifestSha256
        )
          throw new Error("Room game version changed unexpectedly");
        return { token: refreshed.ticket, expiresAt: refreshed.expiresAt };
      };
      client = new RealtimeClient({
        baseUrl: realtimeUrl,
        initialTicket: { token: initial.ticket, expiresAt: initial.expiresAt },
        refreshTicket,
        reconnect: true,
        telemetry: (rttMs) => performanceSampler?.snapshot(rttMs),
      });
      const liveness = mountRuntimeLiveness(client);
      disposeLiveness = liveness.dispose;
      client.onStatus((status) => {
        liveness.connection(status);
        options.onConnection(status);
      });
      unsubscribeMessages = client.onMessage((message) => {
        if (message.type === "error") options.onError(message.message);
        else if (message.type === "presence") {
          latestPresence = message.players;
          pushPresentation();
        }
      });
      unsubscribeSnapshot = client.subscribe((snapshot) => {
        liveness.snapshot();
        frame.contentWindow?.postMessage({ type: "snapshot", channel, snapshot }, "*");
      });
      frame.addEventListener("load", () => {
        frame.contentWindow?.postMessage(
          {
            type: "init",
            channel,
            role: options.role,
            mode: options.mode,
            playerId: initial.playerId,
            gameId: initial.gameId,
            gameVersion: initial.gameVersion,
            manifestUrl: initial.manifestUrl,
            manifestSha256: initial.manifestSha256,
          },
          "*",
        );
        pushPresentation();
      });
      options.mount.replaceChildren(frame);
      client.start();
    } catch (reason) {
      if (!disposed)
        options.onError(reason instanceof Error ? reason.message : "Game could not start");
    }
  }
}
