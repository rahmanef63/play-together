import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createWebServer } from "../apps/web/server.mjs";
import { createGameCdnServer } from "../scripts/serve-game-cdn.mjs";

const cleanups = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.();
});

describe("static HTTP boundaries", () => {
  it("keeps the web server alive after malformed and escaping paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "play-together-web-"));
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<!doctype html><title>shell</title>");
    await writeFile(join(root, "game-frame.html"), "<!doctype html><title>game frame</title>");
    await writeFile(join(root, "assets/app.js"), "export {};");
    const { port, close } = await listen(createWebServer({ root }));
    cleanups.push(async () => {
      await close();
      await rm(root, { recursive: true, force: true });
    });

    expect((await rawRequest(port, "/%E0%A4%A")).status).toBe(400);
    expect((await rawRequest(port, "/..%2f..%2fetc%2fpasswd")).status).toBe(403);
    expect((await rawRequest(port, "/assets/missing.js")).status).toBe(404);
    const asset = await rawRequest(port, "/assets/app.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["access-control-allow-origin"]).toBe("*");
    expect(asset.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(asset.headers["cache-control"]).toContain("immutable");
    const shell = await rawRequest(port, "/");
    expect(shell.status).toBe(200);
    expect(shell.headers["access-control-allow-origin"]).toBeUndefined();
    expect(shell.headers["cross-origin-resource-policy"]).toBe("same-origin");
    const gameFrame = await rawRequest(port, "/game-frame.html");
    expect(gameFrame.status).toBe(200);
    expect(gameFrame.headers["content-security-policy"]).toContain(
      "style-src 'self' 'unsafe-inline'",
    );
    expect(gameFrame.headers["x-frame-options"]).toBeUndefined();
    const health = await rawRequest(port, "/healthz");
    expect(health.status).toBe(200);
    expect(health.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("serves only contained game assets with explicit cross-origin headers", async () => {
    const root = await mkdtemp(join(tmpdir(), "play-together-cdn-"));
    await mkdir(join(root, "games/demo/1.0.0"), { recursive: true });
    await writeFile(join(root, "catalog.json"), '{"games":[]}');
    await writeFile(join(root, "games/demo/1.0.0/server.js"), "export {};");
    await mkdir(join(root, "games/demo/1.0.0/assets"), { recursive: true });
    await writeFile(
      join(root, "games/demo/1.0.0/assets/car.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    await writeFile(join(root, "games/demo/1.0.0/assets/blocked.txt"), "not allowed");
    const { port, close } = await listen(createGameCdnServer({ root }));
    cleanups.push(async () => {
      await close();
      await rm(root, { recursive: true, force: true });
    });

    expect((await rawRequest(port, "/%E0%A4%A")).status).toBe(400);
    expect((await rawRequest(port, "/..%2f..%2fetc%2fpasswd")).status).toBe(403);
    const asset = await rawRequest(port, "/games/demo/1.0.0/server.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["access-control-allow-origin"]).toBe("*");
    expect(asset.headers["cache-control"]).toContain("immutable");
    const image = await rawRequest(port, "/games/demo/1.0.0/assets/car.png");
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toBe("image/png");
    expect(image.headers["cache-control"]).toContain("immutable");
    expect(image.headers["access-control-allow-origin"]).toBe("*");
    expect((await rawRequest(port, "/games/demo/1.0.0/assets/blocked.txt")).status).toBe(415);
    expect((await rawRequest(port, "/games/demo/1.0.0/image.png")).status).toBe(404);
    expect((await rawRequest(port, "/healthz")).status).toBe(200);
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

function rawRequest(port, path) {
  return new Promise((resolvePromise, reject) => {
    const outgoing = request({ hostname: "127.0.0.1", port, path, method: "GET" }, (incoming) => {
      let body = "";
      incoming.setEncoding("utf8");
      incoming.on("data", (chunk) => {
        body += chunk;
      });
      incoming.on("end", () =>
        resolvePromise({ status: incoming.statusCode, headers: incoming.headers, body }),
      );
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}
