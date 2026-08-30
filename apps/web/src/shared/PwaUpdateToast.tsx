import { useCallback, useEffect, useRef, useState } from "react";

const OWNED_CACHE_PREFIX = "play-together-";
const OWNED_COOKIE_PREFIXES = ["pt_", "play_together_cache_"];
const CHECK_INTERVAL_MS = 2 * 60_000;

export function PwaUpdateToast({ quiet = false }: { quiet?: boolean }) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const applyingRef = useRef(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState("");
  const [applying, setApplying] = useState(false);

  const inspectRegistration = useCallback((registration: ServiceWorkerRegistration) => {
    if (registration.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
  }, []);

  const checkServerVersion = useCallback(async () => {
    try {
      const version = await fetchServerVersion();
      if (!version) return;
      setServerVersion(version);
      if (version !== __APP_VERSION__) {
        setUpdateAvailable(true);
        await registrationRef.current?.update();
      }
    } catch {
      // Update checks must never interfere with gameplay or navigation.
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    let disposed = false;
    let interval = 0;

    const onControllerChange = () => {
      if (applyingRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (disposed) return;
        registrationRef.current = registration;
        inspectRegistration(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
        void registration.update();
        void checkServerVersion();
        interval = window.setInterval(() => {
          void registration.update();
          void checkServerVersion();
        }, CHECK_INTERVAL_MS);
      })
      .catch(() => undefined);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkServerVersion();
    };
    const onOnline = () => void checkServerVersion();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      if (interval) window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [checkServerVersion, inspectRegistration]);

  const applyUpdate = async () => {
    applyingRef.current = true;
    setApplying(true);
    const latestVersion = serverVersion || (await fetchServerVersion()) || undefined;
    await clearOwnedCaches(latestVersion);
    await clearOwnedCookies();
    const registration =
      registrationRef.current ?? (await navigator.serviceWorker.getRegistration());
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => window.location.reload(), 1_800);
      return;
    }
    try {
      await registration?.update();
    } finally {
      window.location.reload();
    }
  };

  if (!updateAvailable || quiet) return null;
  return (
    <aside className="update-toast" role="status" aria-live="polite">
      <div className="update-toast__icon" aria-hidden="true">
        ↻
      </div>
      <div className="update-toast__copy">
        <strong>New version ready</strong>
        <span>Refreshes the app shell and owned caches. Your sign-in session is preserved.</span>
      </div>
      <button
        className="update-toast__reload"
        type="button"
        disabled={applying}
        onClick={() => void applyUpdate()}
      >
        {applying ? "Updating…" : "Reload"}
      </button>
      <button
        className="update-toast__dismiss"
        type="button"
        aria-label="Dismiss update"
        onClick={() => setUpdateAvailable(false)}
      >
        ×
      </button>
    </aside>
  );
}

async function fetchServerVersion(): Promise<string | null> {
  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { version?: unknown };
    return typeof payload.version === "string" ? payload.version : null;
  } catch {
    return null;
  }
}

async function clearOwnedCaches(preserveVersion?: string) {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(
        (key) =>
          key.startsWith(OWNED_CACHE_PREFIX) &&
          (!preserveVersion || !key.endsWith(`-${preserveVersion}`)),
      )
      .map((key) => caches.delete(key)),
  );
}

async function clearOwnedCookies() {
  const names = document.cookie
    .split(";")
    .map((rawCookie) => rawCookie.split("=", 1)[0]?.trim() ?? "")
    .filter(
      (name) => name.length > 0 && OWNED_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );
  const cookieStore = (
    window as unknown as { cookieStore?: { delete(name: string): Promise<void> } }
  ).cookieStore;
  if (cookieStore) {
    await Promise.all(names.map((name) => cookieStore.delete(name)));
    return;
  }
  for (const name of names) {
    // biome-ignore lint/suspicious/noDocumentCookie: compatibility fallback for browsers without Cookie Store API.
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
