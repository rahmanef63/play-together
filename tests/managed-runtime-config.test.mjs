import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("managed Vercel runtime configuration", () => {
  it("pins realtime to Singapore and hashes browser endpoint env into Turbo cache", async () => {
    const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
    const turbo = JSON.parse(await readFile("turbo.json", "utf8"));

    expect(vercel.regions).toEqual(["sin1"]);
    expect(vercel.functions["api/realtime.ts"].maxDuration).toBe(300);
    expect(vercel.functions["api/realtime.ts"].includeFiles).toContain(
      "apps/realtime/dist/game-worker.js",
    );
    expect(vercel.rewrites).toContainEqual({
      source: "/api/templates/download",
      destination: "/api/template-download",
    });
    for (const route of ["/rooms", "/developers"]) {
      expect(vercel.rewrites).toContainEqual({ source: route, destination: "/index.html" });
    }
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
