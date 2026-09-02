import type { ConnectionStatus, RealtimeClient } from "@play-together/browser-runtime";

const SNAPSHOT_STALE_MS = 15_000;
const CHECK_INTERVAL_MS = 5_000;
const RESUME_STALE_MS = 12_000;

export function mountRuntimeLiveness(client: RealtimeClient) {
  let lastSnapshotAt = Date.now();
  let hiddenAt: number | null = null;
  let status: ConnectionStatus = client.status;

  const interval = window.setInterval(() => {
    if (document.visibilityState !== "visible" || status !== "connected") return;
    if (Date.now() - lastSnapshotAt < SNAPSHOT_STALE_MS) return;
    lastSnapshotAt = Date.now();
    client.recover("snapshot timeout");
  }, CHECK_INTERVAL_MS);

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const hiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    lastSnapshotAt = Date.now();
    if (hiddenFor >= RESUME_STALE_MS && status === "connected")
      client.recover("resume after suspension");
    else client.probe();
  };
  const onOnline = () => {
    lastSnapshotAt = Date.now();
    if (status === "connected") client.recover("network restored");
    else client.probe();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    lastSnapshotAt = Date.now();
    if (event.persisted && status === "connected") client.recover("page restored");
    else client.probe();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onOnline);
  window.addEventListener("pageshow", onPageShow);

  return {
    snapshot() {
      lastSnapshotAt = Date.now();
    },
    connection(next: ConnectionStatus) {
      status = next;
      if (next === "connected") lastSnapshotAt = Date.now();
    },
    dispose() {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    },
  };
}
