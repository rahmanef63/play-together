import { describe, expect, it } from "vitest";
import {
  parseReleaseIdentity,
  releaseControlEventSchema,
  releaseIdentityKey,
} from "./release-control.js";

const identity = {
  gameId: "turbo-circuit",
  version: "0.5.3",
  manifestSha256: "A".repeat(64),
};

describe("release control contract", () => {
  it("normalizes exact immutable release identity keys", () => {
    expect(releaseIdentityKey(identity)).toBe(`turbo-circuit@0.5.3:${"a".repeat(64)}`);
  });

  it("rejects malformed or oversized mirrored identities", () => {
    expect(parseReleaseIdentity('{"gameId":"bad"}')).toBeNull();
    expect(parseReleaseIdentity("x".repeat(513))).toBeNull();
  });

  it("accepts bounded release-status events", () => {
    expect(
      releaseControlEventSchema.safeParse({
        type: "release-status",
        ...identity,
        status: "blocked",
        changedAt: 123,
      }).success,
    ).toBe(true);
  });
});
