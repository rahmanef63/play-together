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
import "./arcadeConsole.css";
import "./displayGrid.css";
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

interface FramePresentationMessage {
  type: "presentation";
  channel: string;
  layout: "shared" | "split";
  views: Array<{ playerId: string; label: string }>;
}

type ParentMessage = FrameInitMessage | FrameSnapshotMessage | FramePresentationMessage;

const root = document.getElementById("game-root");
if (!root) throw new Error("Game frame root is missing");
const gameRoot: HTMLElement = root;

let channel: string | null = null;
let initialized = false;
let latestSnapshot: SnapshotMessage | null = null;
let latestPresentation: FramePresentationMessage | null = null;
let reconcilePresentation: ((message: FramePresentationMessage) => void) | null = null;
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
  if (message.type === "presentation") {
    latestPresentation = message;
    reconcilePresentation?.(message);
    return;
  }
  latestSnapshot = message.snapshot;
  for (const listener of snapshotListeners) listener(message.snapshot);
});

window.addEventListener("pagehide", () => cleanupModule?.(), { once: true });

function createContext(
  message: FrameInitMessage,
  playerRef: { current: string } = { current: message.playerId },
): BrowserGameContext {
  return {
    get playerId() {
      return playerRef.current;
    },
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
      const displayManager = mountDisplayManager(gameRoot, module, message);
      reconcilePresentation = displayManager.reconcile;
      displayManager.reconcile(
        latestPresentation ?? {
          type: "presentation",
          channel: message.channel,
          layout: "shared",
          views: [{ playerId: message.playerId, label: "Player 1" }],
        },
      );
      cleanupModule = () => {
        reconcilePresentation = null;
        displayManager.dispose();
        snapshotListeners.clear();
      };
    }
    post({ type: "ready", title: manifest.game.title });
  } catch (reason) {
    post({
      type: "error",
      message: reason instanceof Error ? reason.message : "Game surface could not start",
    });
  }
}

function mountDisplayManager(
  root: HTMLElement,
  module: DisplayGameModule,
  init: FrameInitMessage,
): {
  reconcile(message: FramePresentationMessage): void;
  dispose(): void;
} {
  root.replaceChildren();
  const grid = document.createElement("section");
  grid.className = "display-grid";
  grid.dataset.layout = "shared";
  grid.dataset.count = "1";
  root.append(grid);

  type MountedView = {
    key: string;
    playerRef: { current: string };
    viewport: HTMLElement;
    label: HTMLElement;
    dispose: (() => void) | undefined;
  };
  const mounted = new Map<string, MountedView>();

  const createView = (key: string, playerId: string, labelText: string): MountedView => {
    const viewport = document.createElement("article");
    viewport.className = "display-viewport";
    viewport.dataset.displayPlayer = playerId;
    const surface = document.createElement("div");
    surface.className = "display-viewport__surface";
    const label = document.createElement("span");
    label.className = "display-viewport__label";
    label.textContent = labelText;
    viewport.append(surface, label);
    const playerRef = { current: playerId };
    const dispose = module.mountDisplay(surface, createContext(init, playerRef));
    return { key, playerRef, viewport, label, dispose };
  };

  const reconcile = (message: FramePresentationMessage) => {
    const inputViews = message.views.length
      ? message.views
      : [{ playerId: init.playerId, label: "Player 1" }];
    const views = message.layout === "shared" ? [inputViews[0]!] : inputViews.slice(0, 4);
    const desiredKeys = views.map((view) => `player:${view.playerId}`);

    for (const [key, view] of mounted) {
      if (desiredKeys.includes(key)) continue;
      view.dispose?.();
      view.viewport.remove();
      mounted.delete(key);
    }

    const ordered: HTMLElement[] = [];
    views.forEach((view, index) => {
      const key = desiredKeys[index]!;
      let mountedView = mounted.get(key);
      if (!mountedView) {
        mountedView = createView(key, view.playerId, view.label || `Player ${index + 1}`);
        mounted.set(key, mountedView);
      } else {
        mountedView.playerRef.current = view.playerId;
        mountedView.viewport.dataset.displayPlayer = view.playerId;
        mountedView.label.textContent = view.label || `Player ${index + 1}`;
      }
      ordered.push(mountedView.viewport);
    });

    grid.dataset.layout = message.layout;
    grid.dataset.count = String(ordered.length);
    grid.replaceChildren(...ordered);
  };

  return {
    reconcile,
    dispose() {
      for (const view of mounted.values()) view.dispose?.();
      mounted.clear();
      root.replaceChildren();
    },
  };
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
    (candidate.type === "init" ||
      candidate.type === "snapshot" ||
      candidate.type === "presentation")
  );
}
