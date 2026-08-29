import { describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "../convex/_shared/passwordCrypto";

describe("room and account password hashing", () => {
  it("uses salted one-way hashes", async () => {
    const first = await hashSecret("safe-password-123");
    const second = await hashSecret("safe-password-123");
    expect(first).not.toBe(second);
    expect(first).not.toContain("safe-password-123");
    expect(await verifySecret("safe-password-123", first)).toBe(true);
    expect(await verifySecret("wrong-password", first)).toBe(false);
  });
});
