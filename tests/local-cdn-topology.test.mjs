import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { requiresConvexNetworkRefresh } from "../scripts/local-stack/topology.mjs";

describe("local game CDN topology", () => {
  it("keeps release bytes bind-mounted instead of baking them into the local image", async () => {
    const compose = await readFile("docker-compose.local.yml", "utf8");
    const dockerfile = await readFile("infra/game-cdn/Dockerfile.local", "utf8");

    expect(compose).toContain("infra/game-cdn/Dockerfile.local");
    expect(compose).toContain("./releases/game-cdn:/srv/games:ro");
    expect(dockerfile).not.toContain("pnpm game:publish");
    expect(dockerfile).not.toContain("releases/game-cdn");
  });

  it("keeps Compose networks project-scoped so service aliases cannot collide", async () => {
    const compose = await readFile("docker-compose.yml", "utf8");
    const example = await readFile(".env.example", "utf8");

    expect(compose).toContain("networks:\n  platform: {}\n");
    expect(compose).not.toContain("PLATFORM_NETWORK_NAME");
    expect(example).not.toContain("PLATFORM_NETWORK_NAME");
    expect(example).not.toContain("PLATFORM_NETWORK_EXTERNAL");
  });

  it("refreshes Convex networking only when the CDN identity changed underneath it", () => {
    expect(
      requiresConvexNetworkRefresh(
        { gameCdn: "cdn-old", convexBackend: "convex" },
        { gameCdn: "cdn-new", convexBackend: "convex" },
      ),
    ).toBe(true);
    expect(
      requiresConvexNetworkRefresh(
        { gameCdn: "cdn", convexBackend: "convex" },
        { gameCdn: "cdn", convexBackend: "convex" },
      ),
    ).toBe(false);
    expect(
      requiresConvexNetworkRefresh(
        { gameCdn: "cdn-old", convexBackend: "convex-old" },
        { gameCdn: "cdn-new", convexBackend: "convex-new" },
      ),
    ).toBe(false);
  });
});
