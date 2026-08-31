import { describe, expect, it, vi } from "vitest";
import { isManifestFetchFailure, retryManifestFetch } from "../scripts/publish-to-convex/retry.mjs";

const manifestFetchError = () => ({ data: { code: "MANIFEST_FETCH_FAILED" } });

describe("game manifest publication retry", () => {
  it("retries transient manifest fetch failures and then succeeds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(manifestFetchError())
      .mockRejectedValueOnce(manifestFetchError())
      .mockResolvedValue("published");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(retryManifestFetch(operation, { attempts: 5, delayMs: 10, sleep })).resolves.toBe(
      "published",
    );
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it("does not retry security or integrity failures", async () => {
    const integrityError = { data: { code: "INTEGRITY_FAILED" } };
    const operation = vi.fn().mockRejectedValue(integrityError);
    const sleep = vi.fn();

    await expect(retryManifestFetch(operation, { sleep })).rejects.toBe(integrityError);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(isManifestFetchFailure(integrityError)).toBe(false);
  });
});
