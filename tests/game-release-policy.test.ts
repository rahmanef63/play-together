import { describe, expect, it } from "vitest";
import { pinnedReleaseAccess } from "../convex/_shared/gameRelease";

describe("game release policy", () => {
  const sha = "a".repeat(64);

  it("allows exact active and retired releases for already pinned rooms", () => {
    expect(pinnedReleaseAccess({ manifestSha256: sha, status: "published" }, sha)).toBe("allowed");
    expect(pinnedReleaseAccess({ manifestSha256: sha, status: "retired" }, sha)).toBe("allowed");
  });

  it("blocks emergency-disabled releases and mismatched pins", () => {
    expect(pinnedReleaseAccess({ manifestSha256: sha, status: "blocked" }, sha)).toBe("blocked");
    expect(pinnedReleaseAccess({ manifestSha256: sha, status: "published" }, "b".repeat(64))).toBe(
      "mismatch",
    );
    expect(pinnedReleaseAccess(null, sha)).toBe("mismatch");
  });
});
