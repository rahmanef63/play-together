import {
  fetchVerifiedManifest,
  importVerifiedModule,
  resolveModuleUrl,
} from "@play-together/browser-runtime";
import type { ControllerMode, SnapshotMessage } from "@play-together/contracts";
import type {
  BrowserGameContext,
  ControllerGameModule,
  DisplayGameModule,
} from "@play-together/game-sdk";

interface FrameInitMessage {
  type: "init";
  channel: string;
  role: "controller" | "display";
  mode: ControllerMode;
  playerId: string;
  gameId: string;
  gameVersion: string;
  manifestUrl: string;
  manifestSha256: string;
}

interface FrameSnapshotMessage {
  type: "snapshot";
  channel: string;
  snapshot: SnapshotMessage;
}

type ParentMessage = FrameInitMessage | FrameSnapshotMessage;

const root = document.getElementById("game-root");
if (!root) throw new Error("Game frame root is missing");
const gameRoot: HTMLElement = root;

let channel: string | null = null;
let initialized = false;
let latestSnapshot: SnapshotMessage | null = null;
let cleanupModule: undefined | (() => void);
const snapshotListeners = new Set<(snapshot: SnapshotMessage) => void>();

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== parent || !isParentMessage(event.data)) return;
  const message = event.data;
  if (message.type === "init") {
    if (initialized) return;
    initialized = true;
    channel = message.channel;
    void mount(message);
    return;
  }
  if (!channel || message.channel !== channel) return;
  latestSnapshot = message.snapshot;
  for (const listener of snapshotListeners) listener(message.snapshot);
});

window.addEventListener("pagehide", () => cleanupModule?.(), { once: true });

async function mount(message: FrameInitMessage): Promise<void> {
  try {
    const manifest = await fetchVerifiedManifest(message.manifestUrl, message.manifestSha256);
    if (manifest.game.id !== message.gameId || manifest.game.version !== message.gameVersion) {
      throw new Error("Pinned game version does not match its manifest");
    }
    const entry =
      message.role === "display" ? manifest.entries.display : manifest.entries.controller;
    const module = await importVerifiedModule<DisplayGameModule | ControllerGameModule>(
      resolveModuleUrl(message.manifestUrl, entry.url),
      entry.sha256,
    );
    const context: BrowserGameContext = {
      playerId: message.playerId,
      mode: message.mode,
      sendInput(payload) {
        post({ type: "input", payload });
      },
      subscribe(listener) {
        snapshotListeners.add(listener);
        if (latestSnapshot) listener(latestSnapshot);
        return () => snapshotListeners.delete(listener);
      },
      getLatestSnapshot() {
        return latestSnapshot;
      },
      setStatus(status) {
        post({ type: "status", status });
      },
    };
    if (message.role === "display" && "mountDisplay" in module) {
      cleanupModule = module.mountDisplay(gameRoot, context);
    } else if (message.role === "controller" && "mountController" in module) {
      cleanupModule = module.mountController(gameRoot, context);
    } else {
      throw new Error(`Game bundle does not implement the ${message.role} surface`);
    }
    post({ type: "ready", title: manifest.game.title });
  } catch (reason) {
    post({
      type: "error",
      message: reason instanceof Error ? reason.message : "Game surface could not start",
    });
  }
}

function post(payload: Record<string, unknown>): void {
  if (!channel) return;
  parent.postMessage({ ...payload, channel }, "*");
}

function isParentMessage(value: unknown): value is ParentMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { type?: unknown; channel?: unknown };
  return (
    typeof candidate.channel === "string" &&
    (candidate.type === "init" || candidate.type === "snapshot")
  );
}
