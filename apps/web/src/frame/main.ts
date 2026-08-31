import type { SnapshotMessage } from "@play-together/contracts";
import "./styles/index.css";
import { mountFrame } from "./mountFrame";
import { type FramePresentationMessage, isParentMessage } from "./protocol";

const root = document.getElementById("game-root");
if (!root) throw new Error("Game frame root is missing");
let channel: string | null = null;
let initialized = false;
let latestSnapshot: SnapshotMessage | null = null;
let latestPresentation: FramePresentationMessage | null = null;
let reconcilePresentation: ((message: FramePresentationMessage) => void) | null = null;
let cleanupModule: (() => void) | undefined;
const snapshotListeners = new Set<(snapshot: SnapshotMessage) => void>();
const assetCache = new Map<string, Promise<Blob>>();

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== parent || !isParentMessage(event.data)) return;
  const message = event.data;
  if (message.type === "init") {
    if (initialized) return;
    initialized = true;
    channel = message.channel;
    void mountFrame(root, message, {
      assetCache,
      getLatestPresentation: () => latestPresentation,
      getLatestSnapshot: () => latestSnapshot,
      post,
      setReconcile: (reconcile) => {
        reconcilePresentation = reconcile;
      },
      snapshotListeners,
    })
      .then((cleanup) => {
        cleanupModule = cleanup;
      })
      .catch((reason: unknown) =>
        post({
          type: "error",
          message: reason instanceof Error ? reason.message : "Game surface could not start",
        }),
      );
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

function post(payload: Record<string, unknown>): void {
  if (channel) parent.postMessage({ ...payload, channel }, "*");
}
