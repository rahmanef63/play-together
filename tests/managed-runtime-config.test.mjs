import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("managed Vercel runtime configuration", () => {
  it("pins realtime to Singapore and hashes browser endpoint env into Turbo cache", async () => {
    const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
    const turbo = JSON.parse(await readFile("turbo.json", "utf8"));

    expect(vercel.regions).toEqual(["sin1"]);
    expect(vercel.functions["api/realtime.mjs"].maxDuration).toBe(300);
    expect(vercel.functions["api/realtime.mjs"].includeFiles).toBe("apps/realtime/dist/*.js");
    expect(vercel.functions["api/template-download.mjs"].maxDuration).toBe(30);
    const apiFiles = await readdir("api");
    expect(apiFiles.filter((name) => name.endsWith(".ts"))).toEqual([]);
    const realtimeAdapter = await readFile("api/realtime.mjs", "utf8");
    const runtimeManifest = JSON.parse(await readFile("api/realtime-runtime.json", "utf8"));
    expect(runtimeManifest.entry).toBe("../apps/realtime/dist/index.js");
    expect(realtimeAdapter).toContain("./realtime-runtime.json");
    expect(realtimeAdapter).toContain("await import(runtimeManifest.entry)");
    expect(realtimeAdapter).toContain("await gateway.ready()");
    expect(realtimeAdapter).not.toContain("apps/realtime/src/");
    expect(realtimeAdapter).not.toContain("../apps/realtime/dist/index.js");
    expect(vercel.rewrites).toContainEqual({
      source: "/api/templates/download",
      destination: "/api/template-download",
    });
    for (const route of ["/rooms", "/developers"]) {
      expect(vercel.rewrites).toContainEqual({ source: route, destination: "/index.html" });
    }
    expect(vercel.headers).toContainEqual({
      source: "/engine-vendors/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    });
    for (const source of ["/version.json", "/sw.js", "/manifest.webmanifest"]) {
      expect(vercel.headers).toContainEqual({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      });
    }
    expect(turbo.globalEnv).toEqual(
      expect.arrayContaining(["VITE_CONVEX_URL", "VITE_REALTIME_URL"]),
    );
    expect(turbo.globalPassThroughEnv ?? []).not.toContain("VITE_CONVEX_URL");
    expect(turbo.globalPassThroughEnv ?? []).not.toContain("VITE_REALTIME_URL");
  });
});
