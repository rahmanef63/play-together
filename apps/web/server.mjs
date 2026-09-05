import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { embedContentSecurityPolicy, isEmbedPath } from "./embed-policy.mjs";

const defaultShellCsp =
  "default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss: http: ws:; img-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
const gameFrameCsp =
  "default-src 'none'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src https: http:; img-src data: blob: https: http:; worker-src blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'";
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export function createWebServer(options = {}) {
  const root = resolve(
    options.root || process.env.WEB_ROOT || new URL("./dist", import.meta.url).pathname,
  );
  const shellCsp =
    options.contentSecurityPolicy || process.env.CONTENT_SECURITY_POLICY || defaultShellCsp;
  return createServer((request, response) => {
    void handleRequest(request, response, { root, shellCsp }).catch(() => {
      if (!response.headersSent) sendPlain(response, 500, "Internal server error");
      else response.destroy();
    });
  });
}

async function handleRequest(request, response, context) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("allow", "GET, HEAD");
    sendPlain(response, 405, "Method not allowed");
    return;
  }
  let url;
  try {
    url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  } catch {
    sendPlain(response, 400, "Malformed URL");
    return;
  }
  if (url.pathname === "/healthz") {
    sendHeaders(response, "application/json; charset=utf-8", "no-store", {
      isGameFrame: false,
      isPublicAsset: false,
      shellCsp: context.shellCsp,
    });
    response.writeHead(200);
    if (request.method !== "HEAD")
      response.end(JSON.stringify({ ok: true, service: "play-together-web" }));
    else response.end();
    return;
  }

  let decodedPath;
  let candidate;
  try {
    decodedPath = decodeURIComponent(url.pathname);
    candidate = resolveWebPath(
      context.root,
      decodedPath === "/embed/game-frame.html"
        ? "/game-frame.html"
        : decodedPath === "/embed/tv.html"
          ? "/tv.html"
          : decodedPath,
    );
  } catch (error) {
    sendPlain(
      response,
      error instanceof URIError || error instanceof TypeError ? 400 : 403,
      "Invalid path",
    );
    return;
  }

  try {
    const info = await stat(candidate);
    if (!info.isFile()) throw new Error("not a file");
  } catch {
    if (extname(decodedPath)) {
      sendPlain(response, 404, "Not found");
      return;
    }
    candidate = resolve(context.root, "index.html");
    try {
      const fallback = await stat(candidate);
      if (!fallback.isFile()) throw new Error("missing shell");
    } catch {
      sendPlain(response, 404, "Application shell not found");
      return;
    }
  }

  const isEngineVendor = candidate.includes(`${sep}engine-vendors${sep}`);
  const cache =
    candidate.endsWith("index.html") ||
    candidate.endsWith("sw.js") ||
    candidate.endsWith("manifest.webmanifest")
      ? "no-cache"
      : candidate.includes(`${sep}assets${sep}`) || isEngineVendor
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
  const isGameFrame = candidate.endsWith("game-frame.html");
  const isPublicAsset = candidate.includes(`${sep}assets${sep}`);
  sendHeaders(response, types[extname(candidate)] || "application/octet-stream", cache, {
    isGameFrame,
    isPublicAsset: isPublicAsset || isEngineVendor,
    shellCsp: context.shellCsp,
    isEmbed: isEmbedPath(decodedPath),
  });
  response.writeHead(200);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(candidate)
    .on("error", () => response.destroy())
    .pipe(response);
}

export function resolveWebPath(root, pathname) {
  const candidate = resolve(root, `.${pathname.startsWith("/") ? pathname : `/${pathname}`}`);
  const relation = relative(root, candidate);
  if (relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    throw new Error("Path escapes web root");
  }
  return candidate;
}

function sendHeaders(
  response,
  contentType,
  cacheControl,
  { isGameFrame, isPublicAsset, shellCsp, isEmbed = false },
) {
  response.setHeader("content-type", contentType);
  response.setHeader("cache-control", cacheControl);
  const policy = isGameFrame ? gameFrameCsp : shellCsp;
  response.setHeader(
    "content-security-policy",
    isEmbed ? embedContentSecurityPolicy(policy) : policy,
  );
  response.setHeader("cross-origin-opener-policy", "same-origin");
  response.setHeader("cross-origin-embedder-policy", "credentialless");
  response.setHeader(
    "permissions-policy",
    "fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), camera=(self), microphone=()",
  );
  response.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader(
    "cross-origin-resource-policy",
    isPublicAsset || isEmbed ? "cross-origin" : "same-origin",
  );
  if (isPublicAsset) response.setHeader("access-control-allow-origin", "*");
  if (!isGameFrame && !isEmbed) response.setHeader("x-frame-options", "DENY");
}

function sendPlain(response, status, message) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 8080);
  createWebServer().listen(port, host, () => console.log(`play-together-web:${host}:${port}`));
}
