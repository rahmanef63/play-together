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
import "./consoleShell.css";
import "./builtinController.css";
import { mountBuiltinController } from "./builtinController";
import { mountConsoleShell, resolveConsoleShellPreset } from "./consoleShell";

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

function createContext(message: FrameInitMessage): BrowserGameContext {
  return {
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
}

async function mount(message: FrameInitMessage): Promise<void> {
  try {
    const manifest = await fetchVerifiedManifest(message.manifestUrl, message.manifestSha256);
    if (manifest.game.id !== message.gameId || manifest.game.version !== message.gameVersion) {
      throw new Error("Pinned game version does not match its manifest");
    }
    const context = createContext(message);
    const preset = resolveConsoleShellPreset(manifest);

    const builtinConsole =
      manifest.controller.console?.renderer === "builtin" ? manifest.controller.console : undefined;

    if (message.role === "controller" && message.mode === "handheld") {
      const displayModule = await importVerifiedModule<DisplayGameModule>(
        resolveModuleUrl(message.manifestUrl, manifest.entries.display.url),
        manifest.entries.display.sha256,
      );
      if (!("mountDisplay" in displayModule)) {
        throw new Error("Handheld mode requires a display surface");
      }
      const surface = mountConsoleShell(gameRoot, {
        mode: "handheld",
        preset,
        title: manifest.game.title,
      });
      if (!surface.screen) throw new Error("Handheld shell did not create a game screen");
      const disposeDisplay = displayModule.mountDisplay(surface.screen, context);

      let disposeController: undefined | (() => void);
      if (builtinConsole) {
        disposeController = mountBuiltinController(surface.controls, builtinConsole, context);
      } else {
        const entry = manifest.entries.controller;
        if (!entry) throw new Error("Legacy handheld controller entry is missing");
        const controllerModule = await importVerifiedModule<ControllerGameModule>(
          resolveModuleUrl(message.manifestUrl, entry.url),
          entry.sha256,
        );
        if (!("mountController" in controllerModule)) {
          throw new Error("Handheld mode requires a controller surface");
        }
        disposeController = controllerModule.mountController(surface.controls, context);
      }
      cleanupModule = () => {
        disposeDisplay?.();
        disposeController?.();
        snapshotListeners.clear();
        surface.dispose();
      };
    } else if (message.role === "controller") {
      const surface = mountConsoleShell(gameRoot, {
        mode: "remote",
        preset,
        title: manifest.game.title,
      });
      let disposeController: undefined | (() => void);
      if (builtinConsole) {
        disposeController = mountBuiltinController(surface.controls, builtinConsole, context);
      } else {
        const entry = manifest.entries.controller;
        if (!entry) throw new Error("Legacy remote controller entry is missing");
        const module = await importVerifiedModule<ControllerGameModule>(
          resolveModuleUrl(message.manifestUrl, entry.url),
          entry.sha256,
        );
        if (!("mountController" in module)) {
          throw new Error("Game bundle does not implement the controller surface");
        }
        disposeController = module.mountController(surface.controls, context);
      }
      cleanupModule = () => {
        disposeController?.();
        snapshotListeners.clear();
        surface.dispose();
      };
    } else {
      const entry = manifest.entries.display;
      const module = await importVerifiedModule<DisplayGameModule>(
        resolveModuleUrl(message.manifestUrl, entry.url),
        entry.sha256,
      );
      if (!("mountDisplay" in module)) {
        throw new Error("Game bundle does not implement the display surface");
      }
      cleanupModule = module.mountDisplay(gameRoot, context);
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
