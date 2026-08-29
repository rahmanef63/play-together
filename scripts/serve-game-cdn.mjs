import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const types = {
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

export function createGameCdnServer(options = {}) {
  const root = resolve(
    options.root || process.env.GAME_CDN_ROOT || resolve(process.cwd(), "releases/game-cdn"),
  );
  return createServer((request, response) => {
    void handleRequest(request, response, root).catch(() => {
      if (!response.headersSent) sendPlain(response, 500, "Internal server error");
      else response.destroy();
    });
  });
}

async function handleRequest(request, response, root) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("allow", "GET, HEAD");
    sendPlain(response, 405, "Method not allowed");
    return;
  }
  let url;
  let pathname;
  let candidate;
  try {
    url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    pathname = decodeURIComponent(url.pathname);
    candidate = resolveGameAssetPath(root, pathname);
  } catch (error) {
    sendPlain(
      response,
      error instanceof URIError || error instanceof TypeError ? 400 : 403,
      "Invalid path",
    );
    return;
  }
  if (pathname === "/healthz") {
    sendGameHeaders(response, "application/json; charset=utf-8", "no-store");
    response.writeHead(200);
    if (request.method !== "HEAD")
      response.end(JSON.stringify({ ok: true, service: "play-together-game-cdn" }));
    else response.end();
    return;
  }
  try {
    const info = await stat(candidate);
    if (!info.isFile()) throw new Error("not a file");
  } catch {
    sendPlain(response, 404, "Not found");
    return;
  }
  const contentType = types[extname(candidate)];
  if (!contentType) {
    sendPlain(response, 415, "Unsupported asset type");
    return;
  }
  sendGameHeaders(
    response,
    contentType,
    pathname.includes("/games/") ? "public, max-age=31536000, immutable" : "no-cache",
  );
  response.writeHead(200);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(candidate)
    .on("error", () => response.destroy())
    .pipe(response);
}

export function resolveGameAssetPath(root, pathname) {
  const candidate = resolve(root, `.${pathname.startsWith("/") ? pathname : `/${pathname}`}`);
  const relation = relative(root, candidate);
  if (relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    throw new Error("Path escapes game CDN root");
  }
  return candidate;
}

function sendGameHeaders(response, contentType, cacheControl) {
  response.setHeader("content-type", contentType);
  response.setHeader("cache-control", cacheControl);
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("cross-origin-resource-policy", "cross-origin");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("content-security-policy", "default-src 'none'; sandbox");
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
  const port = Number(process.env.PORT || 8081);
  const host = process.env.HOST || "127.0.0.1";
  createGameCdnServer().listen(port, host, () => console.log(`game-cdn:${host}:${port}`));
}
