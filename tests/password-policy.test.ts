import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateAccountPassword,
} from "../convex/_shared/passwordPolicy";

describe("account password policy", () => {
  it("accepts simple passwords and passphrases at or above the minimum", () => {
    expect(() => validateAccountPassword("12345678")).not.toThrow();
    expect(() => validateAccountPassword("kopi pagi bersama teman")).not.toThrow();
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it("rejects only passwords outside the supported length range", () => {
    expect(() => validateAccountPassword("short7")).toThrow();
    expect(() => validateAccountPassword("x".repeat(PASSWORD_MAX_LENGTH + 1))).toThrow();
  });
});
