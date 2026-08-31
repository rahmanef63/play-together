import type { BrowserGameContext, DisplayGameModule } from "@play-together/game-sdk";
import type { FrameInitMessage, FramePresentationMessage } from "./protocol";

export function mountDisplayManager(
  root: HTMLElement,
  module: DisplayGameModule,
  init: FrameInitMessage,
  createContext: (playerRef: { current: string }) => BrowserGameContext,
) {
  root.replaceChildren();
  const grid = document.createElement("section");
  grid.className = "display-grid";
  grid.dataset.layout = "shared";
  grid.dataset.count = "1";
  root.append(grid);
  type MountedView = {
    playerRef: { current: string };
    viewport: HTMLElement;
    label: HTMLElement;
    dispose: (() => void) | undefined;
  };
  const mounted = new Map<string, MountedView>();

  const createView = (playerId: string, labelText: string): MountedView => {
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
    return {
      playerRef,
      viewport,
      label,
      dispose: module.mountDisplay(surface, createContext(playerRef)),
    };
  };

  const reconcile = (message: FramePresentationMessage) => {
    const inputViews = message.views.length
      ? message.views
      : [{ playerId: init.playerId, label: "Player 1" }];
    const first = inputViews[0] ?? { playerId: init.playerId, label: "Player 1" };
    const views = message.layout === "shared" ? [first] : inputViews.slice(0, 4);
    const desiredKeys = views.map((view) => `player:${view.playerId}`);
    for (const [key, view] of mounted) {
      if (desiredKeys.includes(key)) continue;
      view.dispose?.();
      view.viewport.remove();
      mounted.delete(key);
    }
    const ordered = views.map((view, index) => {
      const key = desiredKeys[index] ?? `player:${view.playerId}`;
      let mountedView = mounted.get(key);
      if (!mountedView) {
        mountedView = createView(view.playerId, view.label || `Player ${index + 1}`);
        mounted.set(key, mountedView);
      } else {
        mountedView.playerRef.current = view.playerId;
        mountedView.viewport.dataset.displayPlayer = view.playerId;
        mountedView.label.textContent = view.label || `Player ${index + 1}`;
      }
      return mountedView.viewport;
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
