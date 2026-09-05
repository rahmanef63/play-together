import { afterEach, describe, expect, it, vi } from "vitest";
import { cameraAvailability, cameraFailure, stopCamera } from "./camera";

afterEach(() => vi.unstubAllGlobals());
describe("phone camera permission boundary", () => {
  it("explains a restrictive embedding host before requesting camera access", () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("document", { permissionsPolicy: { allowsFeature: () => false } });
    expect(cameraAvailability()).toContain("embedded preview blocks");
    expect(getUserMedia).not.toHaveBeenCalled();
  });
  it("recognizes a capable secure phone without brand sniffing", () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal("document", {});
    expect(cameraAvailability()).toBeNull();
  });
  it("never treats insecure HTTP as a working camera context", () => {
    vi.stubGlobal("isSecureContext", false);
    expect(cameraAvailability()).toContain("HTTPS");
  });
  it.each(["NotAllowedError", "SecurityError", "NotFoundError", "NotReadableError"])(
    "provides a specific fallback for %s",
    (name) => expect(cameraFailure({ name })).not.toContain("server error"),
  );
  it("stops every stream track when closed", () => {
    const a = vi.fn(),
      b = vi.fn();
    stopCamera({ getTracks: () => [{ stop: a }, { stop: b }] } as unknown as MediaStream);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    stopCamera(null);
  });
});
