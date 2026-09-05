import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyEmbedReady } from "./embedReady";

afterEach(() => vi.unstubAllGlobals());

describe("public embed readiness", () => {
  it.each(["/embed", "/embed/room/DEMO", "/embed/play/DEMO/remote"])(
    "notifies the immediate parent without assuming its hosted sandbox origin: %s",
    (pathname) => {
      const postMessage = vi.fn();
      vi.stubGlobal("window", { location: { pathname }, parent: { postMessage } });
      notifyEmbedReady();
      expect(postMessage).toHaveBeenCalledExactlyOnceWith(
        { type: "play-together:embed-ready", schemaVersion: 1 },
        "*",
      );
      // This public lifecycle marker must never grow authentication or player data.
      expect(Object.keys(postMessage.mock.calls[0]?.[0] ?? {}).sort()).toEqual([
        "schemaVersion",
        "type",
      ]);
    },
  );
  it.each(["/", "/room/DEMO", "/embedded", "/play/DEMO/remote"])(
    "does not send a marker outside the dedicated namespace: %s",
    (pathname) => {
      const postMessage = vi.fn();
      vi.stubGlobal("window", { location: { pathname }, parent: { postMessage } });
      notifyEmbedReady();
      expect(postMessage).not.toHaveBeenCalled();
    },
  );
  it("does not send a marker when opened as a top-level page", () => {
    const current = {
      location: { pathname: "/embed" },
      parent: null as unknown,
      postMessage: vi.fn(),
    };
    current.parent = current;
    vi.stubGlobal("window", current);
    notifyEmbedReady();
    expect(current.postMessage).not.toHaveBeenCalled();
  });
});
