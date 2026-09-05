import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import type { ConvexCredentialsConfig } from "@convex-dev/auth/server";
import { describe, expect, it, vi } from "vitest";
import { withPublicAuthErrors } from "../convex/_shared/passwordProvider";
// Integration-test the exact pinned SDK merge that previously discarded our wrapper.
// Production code does not import this SDK-internal helper.
import { materializeProvider } from "../node_modules/@convex-dev/auth/src/server/provider_utils";

const context = {} as Parameters<ConvexCredentialsConfig["authorize"]>[1];

function materialize(factory: ConvexCredentialsConfig): ConvexCredentialsConfig {
  const configured = materializeProvider(withPublicAuthErrors(factory));
  if (configured.type !== "credentials") throw new Error("Unexpected provider type");
  return configured;
}

describe("configured password-provider error boundary", () => {
  it.each(["InvalidAccountId", "InvalidSecret"])(
    "keeps safe errors after the real SDK materializes %s",
    async (message) => {
      const original = vi.fn(async () => {
        throw new Error(message);
      });
      const provider = materialize(ConvexCredentials({ id: "password", authorize: original }));
      await expect(provider.authorize({ flow: "signIn" }, context)).rejects.toMatchObject({
        data: { code: "INVALID_CREDENTIALS" },
      });
      expect(original).toHaveBeenCalledOnce();
      expect(provider.id).toBe("password");
    },
  );
  it("preserves the real Password provider's validation and normalizes its failure", async () => {
    const provider = materialize(
      Password({
        validatePasswordRequirements: () => {
          throw new Error("Invalid password");
        },
      }),
    );
    await expect(
      provider.authorize({ flow: "signUp", password: "short" }, context),
    ).rejects.toMatchObject({ data: { code: "INVALID_PASSWORD" } });
  });
  it("retains successful authorization, crypto and configured extra providers", async () => {
    const user = { userId: "fixture-user" as never };
    const authorize = vi.fn(async () => user);
    const crypto = {
      hashSecret: vi.fn(async () => "fixture-hash"),
      verifySecret: vi.fn(async () => true),
    };
    const provider = materialize(
      ConvexCredentials({ id: "password", authorize, crypto, extraProviders: [] }),
    );
    await expect(provider.authorize({ flow: "signIn" }, context)).resolves.toEqual(user);
    expect(provider.crypto).toEqual(crypto);
    expect(provider.extraProviders).toEqual([]);
    expect(provider).not.toHaveProperty("options");
  });
  it("does not expose unexpected implementation errors", async () => {
    const provider = materialize(
      ConvexCredentials({
        authorize: async () => {
          throw new Error("private database failure");
        },
      }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(provider.authorize({ flow: "signIn" }, context)).rejects.toMatchObject({
        data: { code: "AUTH_UNAVAILABLE" },
      });
      expect(log).toHaveBeenCalledExactlyOnceWith("Unexpected password provider failure");
    } finally {
      log.mockRestore();
    }
  });
});
