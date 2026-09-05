import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { deviceReviewError, parsePairingInput } from "./pairingInput";

const origin = "https://game.rahmanef.com";
describe("pairing scan and paste boundary", () => {
  it.each([
    "/device?pair=ABCD2345",
    "/device?pair=abcd-2345",
    "/embed/device?pair=ABCD%E2%80%932345",
  ])("accepts only the reviewed first-party route: %s", (path) =>
    expect(parsePairingInput(origin + path, origin)).toEqual({ code: "ABCD2345" }),
  );
  it.each([
    "https://attacker.test/device?pair=ABCD2345",
    "https://game.rahmanef.com.attacker.test/device?pair=ABCD2345",
    "https://attacker@game.rahmanef.com/device?pair=ABCD2345",
    origin + "/device?pair=ABCD2345&pair=EFGH2345",
    origin + "/device?pair=ABCD2345#unexpected",
    origin + "/wrong?pair=ABCD2345",
  ])("rejects an unreviewed QR value: %s", (value) =>
    expect(parsePairingInput(value, origin).error).toBeTruthy(),
  );
  it("explains the difference between a room invitation and a login request", () =>
    expect(parsePairingInput(origin + "/room/ROOM12", origin).error).toContain("room invitation"));
  it("distinguishes session and network failures from expired codes", () => {
    expect(deviceReviewError(new ConvexError({ code: "UNAUTHENTICATED" }))).toContain(
      "session has ended",
    );
    expect(deviceReviewError(new ConvexError({ code: "RATE_LIMITED" }))).toContain("Wait a minute");
    expect(deviceReviewError(new Error("Failed to fetch"))).toContain("connection");
    expect(deviceReviewError(new Error("private server details"))).not.toContain("private");
  });
});
