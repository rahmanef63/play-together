import { createServer, request } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createLoopbackBridge } from "../infra/convex-site-loopback/server.mjs";

const closeables = [];
afterEach(async () => {
  while (closeables.length) await closeables.pop()?.();
});

describe("Convex local issuer bridge", () => {
  it("forwards discovery metadata and preserves the configured public Host", async () => {
    const upstream = createServer((incoming, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ issuer: incoming.headers.host, path: incoming.url }));
    });
    const upstreamAddress = await listen(upstream);
    closeables.push(upstreamAddress.close);
    const bridge = createLoopbackBridge({
      upstreamOrigin: `http://127.0.0.1:${upstreamAddress.port}`,
    });
    const bridgeAddress = await listen(bridge);
    closeables.push(bridgeAddress.close);

    const response = await rawRequest(
      bridgeAddress.port,
      "/.well-known/openid-configuration",
      "convex-site.localhost:43211",
    );
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      issuer: "convex-site.localhost:43211",
      path: "/.well-known/openid-configuration",
    });
  });
});

async function listen(server) {
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No server address");
  return {
    port: address.port,
    close: () => new Promise((resolvePromise) => server.close(resolvePromise)),
  };
}

function rawRequest(port, path, host) {
  return new Promise((resolvePromise, reject) => {
    const outgoing = request(
      { hostname: "127.0.0.1", port, path, headers: { host } },
      (incoming) => {
        let body = "";
        incoming.setEncoding("utf8");
        incoming.on("data", (chunk) => {
          body += chunk;
        });
        incoming.on("end", () =>
          resolvePromise({ status: incoming.statusCode, headers: incoming.headers, body }),
        );
      },
    );
    outgoing.once("error", reject);
    outgoing.end();
  });
}
