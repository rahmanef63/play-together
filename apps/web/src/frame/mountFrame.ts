import {
  fetchVerifiedManifest,
  importVerifiedModule,
  resolveModuleUrl,
} from "@play-together/browser-runtime";
import type { SnapshotMessage } from "@play-together/contracts";
import type { ControllerGameModule, DisplayGameModule } from "@play-together/game-sdk";
import { mountBuiltinController } from "./builtinController";
import { mountConsoleShell, resolveConsoleShellPreset } from "./consoleShell";
import { mountDisplayManager } from "./displayManager";
import { createGameContext } from "./gameContext";
import type { FrameInitMessage, FramePresentationMessage } from "./protocol";
import { type RuntimeImportSource, resolveRuntimeImports } from "./runtimeDependencies";

export interface FrameRuntimeState {
  assetCache: Map<string, Promise<Blob>>;
  getLatestPresentation: () => FramePresentationMessage | null;
  getLatestSnapshot: () => SnapshotMessage | null;
  post: (payload: Record<string, unknown>) => void;
  setReconcile: (reconcile: ((message: FramePresentationMessage) => void) | null) => void;
  snapshotListeners: Set<(snapshot: SnapshotMessage) => void>;
}

export async function mountFrame(
  root: HTMLElement,
  message: FrameInitMessage,
  state: FrameRuntimeState,
): Promise<() => void> {
  const manifest = await fetchVerifiedManifest(message.manifestUrl, message.manifestSha256);
  if (manifest.game.id !== message.gameId || manifest.game.version !== message.gameVersion)
    throw new Error("Pinned game version does not match its manifest");
  const runtimeImports = resolveRuntimeImports(manifest);
  const contextState = {
    assetCache: state.assetCache,
    getLatestSnapshot: state.getLatestSnapshot,
    post: state.post,
    subscribe(listener: (snapshot: SnapshotMessage) => void) {
      state.snapshotListeners.add(listener);
      const latest = state.getLatestSnapshot();
      if (latest) listener(latest);
      return () => state.snapshotListeners.delete(listener);
    },
  };
  const createContext = (playerRef?: { current: string }) =>
    createGameContext(message, manifest, contextState, playerRef);
  const preset = resolveConsoleShellPreset(manifest);
  const builtinConsole =
    manifest.controller.console?.renderer === "builtin" ? manifest.controller.console : undefined;

  if (message.role === "controller" && message.mode === "handheld") {
    const displayModule = await loadDisplay(message, manifest.entries.display, runtimeImports);
    const surface = mountConsoleShell(root, {
      mode: "handheld",
      preset,
      title: manifest.game.title,
    });
    if (!surface.screen) throw new Error("Handheld shell did not create a game screen");
    const disposeDisplay = displayModule.mountDisplay(surface.screen, createContext());
    const disposeController = builtinConsole
      ? mountBuiltinController(surface.controls, builtinConsole, createContext())
      : await mountLegacyController(
          surface.controls,
          message,
          manifest.entries.controller,
          createContext(),
          runtimeImports,
        );
    state.post({ type: "ready", title: manifest.game.title });
    return () => {
      disposeDisplay?.();
      disposeController?.();
      state.snapshotListeners.clear();
      surface.dispose();
    };
  }

  if (message.role === "controller") {
    const surface = mountConsoleShell(root, { mode: "remote", preset, title: manifest.game.title });
    const disposeController = builtinConsole
      ? mountBuiltinController(surface.controls, builtinConsole, createContext())
      : await mountLegacyController(
          surface.controls,
          message,
          manifest.entries.controller,
          createContext(),
          runtimeImports,
        );
    state.post({ type: "ready", title: manifest.game.title });
    return () => {
      disposeController?.();
      state.snapshotListeners.clear();
      surface.dispose();
    };
  }

  const displayModule = await loadDisplay(message, manifest.entries.display, runtimeImports);
  const manager = mountDisplayManager(root, displayModule, message, (playerRef) =>
    createContext(playerRef),
  );
  state.setReconcile(manager.reconcile);
  manager.reconcile(
    state.getLatestPresentation() ?? {
      type: "presentation",
      channel: message.channel,
      layout: "shared",
      views: [{ playerId: message.playerId, label: "Player 1" }],
    },
  );
  state.post({ type: "ready", title: manifest.game.title });
  return () => {
    state.setReconcile(null);
    manager.dispose();
    state.snapshotListeners.clear();
  };
}

async function loadDisplay(
  message: FrameInitMessage,
  entry: { url: string; sha256: string },
  runtimeImports: Readonly<Record<string, RuntimeImportSource>>,
): Promise<DisplayGameModule> {
  const module = await importVerifiedModule<DisplayGameModule>(
    resolveModuleUrl(message.manifestUrl, entry.url),
    entry.sha256,
    runtimeImports,
  );
  if (!("mountDisplay" in module))
    throw new Error("Game bundle does not implement the display surface");
  return module;
}

async function mountLegacyController(
  root: HTMLElement,
  message: FrameInitMessage,
  entry: { url: string; sha256: string } | undefined,
  context: ReturnType<typeof createGameContext>,
  runtimeImports: Readonly<Record<string, RuntimeImportSource>>,
) {
  if (!entry) throw new Error("Legacy controller entry is missing");
  const module = await importVerifiedModule<ControllerGameModule>(
    resolveModuleUrl(message.manifestUrl, entry.url),
    entry.sha256,
    runtimeImports,
  );
  if (!("mountController" in module))
    throw new Error("Game bundle does not implement the controller surface");
  return module.mountController(root, context);
}
