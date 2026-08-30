import { describe, expect, it } from "vitest";
import { PASSWORD_MIN_LENGTH, validateAccountPassword } from "../convex/_shared/passwordPolicy";

describe("account password policy", () => {
  it("accepts a strong password at the minimum length", () => {
    const password = "Aa1!" + "x".repeat(PASSWORD_MIN_LENGTH - 4);
    expect(() => validateAccountPassword(password)).not.toThrow();
  });

  it.each([
    ["too short", "Aa1!short"],
    ["missing uppercase", "lowercase1!xx"],
    ["missing lowercase", "UPPERCASE1!XX"],
    ["missing number", "NoNumbers!xxxx"],
    ["missing symbol", "NoSymbols1234"],
  ])("rejects %s", (_label, password) => {
    expect(() => validateAccountPassword(password)).toThrow();
  });
});
