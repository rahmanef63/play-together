import { fetchVerifiedAsset, resolveModuleUrl } from "@play-together/browser-runtime";
import type { GameManifest, SnapshotMessage } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import type { FrameInitMessage } from "./protocol";

interface ContextState {
  assetCache: Map<string, Promise<Blob>>;
  getLatestSnapshot: () => SnapshotMessage | null;
  post: (payload: Record<string, unknown>) => void;
  subscribe: (listener: (snapshot: SnapshotMessage) => void) => () => void;
}

export function createGameContext(
  message: FrameInitMessage,
  manifest: GameManifest,
  state: ContextState,
  playerRef: { current: string } = { current: message.playerId },
): BrowserGameContext {
  return {
    get playerId() {
      return playerRef.current;
    },
    mode: message.mode,
    sendInput(payload) {
      state.post({ type: "input", payload });
    },
    subscribe: state.subscribe,
    getLatestSnapshot: state.getLatestSnapshot,
    loadAsset(name) {
      const entry = manifest.assets?.[name];
      if (!entry) return Promise.reject(new Error(`Game asset is not declared: ${name}`));
      const url = resolveModuleUrl(message.manifestUrl, entry.url);
      const cacheKey = `${entry.sha256}:${url}`;
      const cached = state.assetCache.get(cacheKey);
      if (cached) return cached;
      const pending = fetchVerifiedAsset(url, entry.sha256, entry.contentType);
      state.assetCache.set(cacheKey, pending);
      return pending;
    },
    setStatus(status) {
      state.post({ type: "status", status });
    },
  };
}
