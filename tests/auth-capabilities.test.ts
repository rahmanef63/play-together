import { describe, expect, it } from "vitest";
import { authCapabilities } from "../convex/_shared/authCapabilities";

describe("auth capabilities", () => {
  it("keeps Google hidden when either OAuth credential is absent", () => {
    expect(authCapabilities({})).toEqual({ google: false });
    expect(authCapabilities({ AUTH_GOOGLE_ID: "client-id" })).toEqual({ google: false });
    expect(authCapabilities({ AUTH_GOOGLE_SECRET: "client-secret" })).toEqual({ google: false });
  });

  it("enables Google only when both credentials are configured", () => {
    expect(
      authCapabilities({ AUTH_GOOGLE_ID: "client-id", AUTH_GOOGLE_SECRET: "client-secret" }),
    ).toEqual({ google: true });
  });
});
