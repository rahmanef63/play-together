import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmbedded, requestExternalGoogleSignIn } from "./embedAuth";

afterEach(() => vi.unstubAllGlobals());
describe("external Google sign-in request", () => {
  it("sends only a public request to highlight the host action", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { parent: { postMessage } });
    expect(isEmbedded()).toBe(true);
    requestExternalGoogleSignIn();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { type: "mso:app-auth-request", schemaVersion: 1, provider: "google" },
      "*",
    );
  });
  it("does not notify a parent or navigate when opened as a normal page", () => {
    const win = { parent: null as unknown, postMessage: vi.fn() };
    win.parent = win;
    vi.stubGlobal("window", win);
    expect(isEmbedded()).toBe(false);
    requestExternalGoogleSignIn();
    expect(win.postMessage).not.toHaveBeenCalled();
  });
});
