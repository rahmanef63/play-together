import { useEffect } from "react";
/** Keep an active game visible; release immediately on leaving or hiding the page. */
export function useScreenAwake(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (disposed || pending || document.hidden || (lock && !lock.released)) return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed || document.hidden) await next.release();
        else lock = next;
      } catch {
        /* Unsupported or power-saving mode: gameplay stays available. */
      } finally {
        pending = false;
      }
    };
    const visibility = () => {
      if (document.hidden) {
        void lock?.release().catch(() => undefined);
        lock = null;
      } else void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
