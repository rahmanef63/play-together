const VERSION = "0.15.0";
const SHELL_CACHE = `play-together-shell-${VERSION}`;
const RUNTIME_CACHE = `play-together-runtime-${VERSION}`;
const OWNED_PREFIX = "play-together-";
const SHELL = [
  "/",
  "/game-frame.html",
  "/manifest.webmanifest",
  "/version.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith(OWNED_PREFIX) && key !== SHELL_CACHE && key !== RUNTIME_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_APP_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys.filter((key) => key.startsWith(OWNED_PREFIX)).map((key) => caches.delete(key)),
          ),
        ),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname === "/version.json" || url.pathname === "/game-registry.json") {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  if (
    ["script", "style", "font", "image", "worker"].includes(request.destination) ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirstRuntime(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/")) || Response.error();
  }
}

async function networkFirstStatic(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

async function cacheFirstRuntime(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}
