import { createServer, request as createUpstreamRequest } from "node:http";
import { pathToFileURL } from "node:url";

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function createLoopbackBridge(options = {}) {
  const upstream = new URL(
    options.upstreamOrigin || process.env.UPSTREAM_ORIGIN || "http://127.0.0.1:3211",
  );
  return createServer((incoming, outgoing) => {
    if (incoming.url === "/healthz") {
      const readiness = createUpstreamRequest(
        {
          protocol: upstream.protocol,
          hostname: upstream.hostname,
          port: upstream.port,
          method: "HEAD",
          path: "/",
        },
        (upstreamResponse) => {
          upstreamResponse.resume();
          outgoing.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          });
          outgoing.end(JSON.stringify({ ok: true, upstreamReachable: true }));
        },
      );
      readiness.setTimeout(3_000, () => readiness.destroy(new Error("upstream timeout")));
      readiness.on("error", () => {
        outgoing.writeHead(503, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        });
        outgoing.end(JSON.stringify({ ok: false, upstreamReachable: false }));
      });
      readiness.end();
      return;
    }
    const headers = {};
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (!hopByHopHeaders.has(name.toLowerCase()) && value !== undefined) headers[name] = value;
    }
    const upstreamRequest = createUpstreamRequest(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port,
        method: incoming.method,
        path: incoming.url,
        headers,
      },
      (upstreamResponse) => {
        const responseHeaders = {};
        for (const [name, value] of Object.entries(upstreamResponse.headers)) {
          if (!hopByHopHeaders.has(name.toLowerCase()) && value !== undefined) {
            responseHeaders[name] = value;
          }
        }
        outgoing.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
        upstreamResponse.pipe(outgoing);
      },
    );
    upstreamRequest.setTimeout(10_000, () =>
      upstreamRequest.destroy(new Error("upstream timeout")),
    );
    upstreamRequest.on("error", () => {
      if (!outgoing.headersSent) {
        outgoing.writeHead(502, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        });
      }
      outgoing.end(JSON.stringify({ error: "convex_site_unavailable" }));
    });
    incoming.pipe(upstreamRequest);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.HOST || "::";
  const port = Number(process.env.PORT || 43211);
  createLoopbackBridge().listen(port, host, () => {
    console.log(`convex-site-loopback:${host}:${port}`);
  });
}
