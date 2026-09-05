import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EMBED_ANCESTORS,
  embedContentSecurityPolicy,
  isEmbedPath,
} from "../apps/web/embed-policy.mjs";
import { createWebServer } from "../apps/web/server.mjs";

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

describe("dedicated MCP embed boundary", () => {
  it("allows every reviewed ancestor without widening the regular application", () => {
    const policy = embedContentSecurityPolicy(
      "default-src 'none'; script-src 'self'; frame-ancestors 'none'",
    );
    expect(policy).toContain("default-src 'none'; script-src 'self'");
    expect(policy.match(/frame-ancestors/g)).toHaveLength(1);
    for (const origin of EMBED_ANCESTORS) expect(policy).toContain(origin);
    const sources = policy.split("frame-ancestors ")[1].split(" ");
    expect(sources.filter((source) => source.includes("*"))).toEqual([
      "https://*.web-sandbox.oaiusercontent.com",
    ]);
    expect(sources).not.toContain("*");
    expect(sources).not.toContain("https:");
    expect(sources).not.toContain("https://*.oaiusercontent.com");
    expect(isEmbedPath("/embed")).toBe(true);
    expect(isEmbedPath("/embed/game-frame.html")).toBe(true);
    expect(isEmbedPath("/embedded")).toBe(false);
  });
  it("keeps Vercel policy and leaf rewrite aligned with the local server", async () => {
    const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
    expect(config.rewrites.find((rule) => rule.source === "/embed/game-frame.html")).toEqual({
      source: "/embed/game-frame.html",
      destination: "/game-frame.html",
    });
    expect(
      config.rewrites.findIndex((rule) => rule.source === "/embed/game-frame.html"),
    ).toBeLessThan(config.rewrites.findIndex((rule) => rule.source === "/embed/:path*"));
    for (const path of ["/embed", "/embed/:path*"]) {
      const policy = config.headers
        .find((rule) => rule.source === path)
        .headers.find((header) => header.key === "Content-Security-Policy").value;
      expect(policy.split("frame-ancestors ")[1]).toBe(`'self' ${EMBED_ANCESTORS.join(" ")}`);
    }
    const rootPolicy = config.headers[0].headers.find(
      (header) => header.key === "Content-Security-Policy",
    ).value;
    expect(rootPolicy).not.toContain("chatgpt.com");
  });
  it("serves the actual nested game frame and limits relaxed headers to /embed", async () => {
    const root = await mkdtemp(join(tmpdir(), "pt-embed-policy-"));
    await writeFile(join(root, "index.html"), "<!doctype html><title>app shell</title>");
    await writeFile(join(root, "game-frame.html"), "<!doctype html><title>game frame</title>");
    await writeFile(join(root, "tv.html"), "<!doctype html><title>tv help</title>");
    const server = createWebServer({ root });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    cleanups.push(async () => {
      await new Promise((resolve) => server.close(resolve));
      await rm(root, { recursive: true });
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const path of ["/embed", "/embed/room/TEST", "/embed/game-frame.html", "/embed/tv.html"]) {
      const response = await fetch(origin + path);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-frame-options")).toBeNull();
      expect(response.headers.get("content-security-policy")).toContain("https://chatgpt.com");
      expect(response.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
      expect(await response.text()).toContain(
        path.endsWith("tv.html") ? "tv help" : path.endsWith(".html") ? "game frame" : "app shell",
      );
    }
    const normal = await fetch(origin + "/");
    expect(normal.headers.get("x-frame-options")).toBe("DENY");
    expect(normal.headers.get("content-security-policy")).not.toContain("chatgpt.com");
    const frame = await fetch(origin + "/game-frame.html");
    expect(frame.headers.get("content-security-policy")).not.toContain("chatgpt.com");
  });
});
