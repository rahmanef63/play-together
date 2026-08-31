import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVerifiedAsset } from "./index";

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
});
