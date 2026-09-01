import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVerifiedAsset, prefetchVerifiedResource, rewriteRuntimeImports } from "./index.js";

describe("verified game assets", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a blob only when the pinned SHA-256 matches", async () => {
    const bytes = new TextEncoder().encode("sprite-bytes");
    const sha = createHash("sha256").update(bytes).digest("hex");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(bytes, { status: 200, headers: { "content-type": "image/png" } }),
      ),
    );
    const blob = await fetchVerifiedAsset("https://games.test/vehicle.png", sha, "image/png");
    expect(blob.type).toBe("image/png");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
  });

  it("rejects a mismatched asset digest", async () => {
    const bytes = new TextEncoder().encode("sprite-bytes");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bytes, { status: 200 })),
    );
    await expect(
      fetchVerifiedAsset("https://games.test/vehicle.png", "0".repeat(64), "image/png"),
    ).rejects.toThrow("integrity");
  });
  it("reuses SHA-verified immutable bytes and requests browser cache", async () => {
    const bytes = new TextEncoder().encode("cached-sprite-bytes");
    const sha = createHash("sha256").update(bytes).digest("hex");
    const fetchMock = vi.fn(
      async () => new Response(bytes, { status: 200, headers: { "content-type": "image/png" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://games.test/cache-proof-unique.png";
    await fetchVerifiedAsset(url, sha, "image/png");
    await fetchVerifiedAsset(url, sha, "image/png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(url, { cache: "force-cache", credentials: "omit" });
  });
  it("warms a verified resource once and reuses it for later runtime loading", async () => {
    const bytes = new TextEncoder().encode("prefetched-runtime-bytes");
    const sha = createHash("sha256").update(bytes).digest("hex");
    const fetchMock = vi.fn(async () => new Response(bytes, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://games.test/prefetch-proof-unique.js";
    await prefetchVerifiedResource(url, sha);
    await fetchVerifiedAsset(url, sha, "text/javascript");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("bounds prefetched verified bytes with an LRU cache", async () => {
    const bytes = new TextEncoder().encode("bounded-prefetch-bytes");
    const sha = createHash("sha256").update(bytes).digest("hex");
    const fetchMock = vi.fn(async () => new Response(bytes, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    for (let index = 0; index < 65; index += 1) {
      await prefetchVerifiedResource(`https://games.test/lru-${index}.js`, sha);
    }
    await prefetchVerifiedResource("https://games.test/lru-0.js", sha);
    expect(fetchMock).toHaveBeenCalledTimes(66);
  });
  it("rewrites only engine-declared runtime module specifiers after verification", () => {
    const source = 'import*as T from"@play-together/runtime/three@0.185.1+pt1";export{T};';
    expect(
      rewriteRuntimeImports(source, {
        "@play-together/runtime/three@0.185.1+pt1":
          "https://game.test/engine-vendors/three@0.185.1+pt1.js",
      }),
    ).toContain('from"https://game.test/engine-vendors/three@0.185.1+pt1.js"');
  });
});
