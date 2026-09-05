import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { authErrorDetails, authErrorMessage } from "../apps/web/src/shared/authErrors";
import { publicAuthFailure } from "../convex/_shared/authErrors";

describe("safe auth failures", () => {
  it.each(["InvalidAccountId", "InvalidSecret", "Invalid credentials"])(
    "uses the same public failure for %s",
    (message) => {
      expect(publicAuthFailure(new Error(message), "signIn").data).toEqual({
        code: "INVALID_CREDENTIALS",
      });
    },
  );
  it("preserves rate limiting as a distinct actionable failure", () => {
    expect(publicAuthFailure(new Error("TooManyFailedAttempts"), "signIn").data).toEqual({
      code: "AUTH_RATE_LIMITED",
    });
  });
  it("does not label server failures as incorrect credentials", () => {
    expect(publicAuthFailure(new Error("database interrupted"), "signIn").data).toEqual({
      code: "AUTH_UNAVAILABLE",
    });
  });
  it("does not forward arbitrary ConvexError data", () => {
    const failure = publicAuthFailure(
      new ConvexError({
        code: "INVALID_EMAIL",
        message: "private@example.test",
        secret: "not-for-display",
      }),
      "signUp",
    );
    expect(failure.data).toEqual({ code: "INVALID_EMAIL" });
    expect(publicAuthFailure(new ConvexError({ code: "INTERNAL_ONLY" }), "signIn").data).toEqual({
      code: "AUTH_UNAVAILABLE",
    });
  });
  it("keeps the user's support reference without raw server internals", () => {
    const text = authErrorMessage(
      new Error(
        "[CONVEX A(auth:signIn)] [Request ID: cc5881a9a2770a3f] Server Error\nCalled by client",
      ),
    );
    expect(text).toContain("Sign-in could not be completed");
    expect(text).not.toContain("cc5881a9a2770a3f");
    expect(
      authErrorDetails(new Error("[Request ID: cc5881a9a2770a3f] Server Error")).reference,
    ).toBe("cc5881a9a2770a3f");
    expect(text).not.toMatch(/Server Error|CONVEX|Called by client/);
  });
  it("renders safe public codes, not arbitrary server messages", () => {
    expect(
      authErrorMessage(
        new ConvexError({ code: "INVALID_CREDENTIALS", message: "private account information" }),
      ),
    ).toContain("Email or password is incorrect");
    expect(
      authErrorMessage(new Error("secret https://example.test/?code=private private@example.test")),
    ).not.toMatch(/https:|private|secret/);
  });
  it("gives specific recovery for network and storage failures", () => {
    expect(authErrorMessage(new Error("Failed to fetch"))).toContain("Check your connection");
    expect(authErrorMessage(new Error("SecurityError: access to storage denied"))).toContain(
      "browser tab",
    );
  });
  it("does not render a malformed support reference", () => {
    expect(authErrorMessage(new Error("[Request ID: javascript:bad]"))).not.toContain("javascript");
  });
  it("has a non-looping recovery message for rejected OAuth callbacks", () => {
    expect(authErrorMessage(new Error("Invalid verification code"), "callback")).toContain(
      "same browser",
    );
  });
});
