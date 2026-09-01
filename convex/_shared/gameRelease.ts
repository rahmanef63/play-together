import { ConvexError } from "convex/values";

export type ReleasePolicyStatus = "active" | "retired" | "blocked";
export type StoredReleaseStatus = "published" | "retired" | "blocked";

export function normalizeReleasePolicy(
  status: ReleasePolicyStatus | undefined,
  reason: string | undefined,
): { status: StoredReleaseStatus; retirementReason?: string } {
  if (!status || status === "active") return { status: "published" };
  const normalizedReason = reason?.trim();
  if (!normalizedReason || normalizedReason.length > 240) {
    throw new ConvexError({
      code: "INVALID_RELEASE_STATUS",
      message: "Retired or blocked releases require a reason of 1–240 characters",
    });
  }
  return { status, retirementReason: normalizedReason };
}

export function pinnedReleaseAccess(
  release: { manifestSha256: string; status: StoredReleaseStatus } | null,
  manifestSha256: string,
): "allowed" | "blocked" | "mismatch" {
  if (!release || release.manifestSha256 !== manifestSha256) return "mismatch";
  return release.status === "blocked" ? "blocked" : "allowed";
}
