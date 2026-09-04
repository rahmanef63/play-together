import { describe, expect, it } from "vitest";
import { appPathFromBrowserPath, browserPathForNavigation } from "./navigation";

describe("embed-aware navigation", () => {
  it("maps the dedicated embed namespace back to normal app routes", () => {
    expect(appPathFromBrowserPath("/embed")).toBe("/");
    expect(appPathFromBrowserPath("/embed/")).toBe("/");
    expect(appPathFromBrowserPath("/embed/room/ABCD")).toBe("/room/ABCD");
    expect(appPathFromBrowserPath("/room/ABCD")).toBe("/room/ABCD");
  });

  it("keeps SPA navigation inside the embed namespace once embedded", () => {
    expect(browserPathForNavigation("/", "/embed")).toBe("/embed");
    expect(browserPathForNavigation("/room/ABCD", "/embed")).toBe("/embed/room/ABCD");
    expect(browserPathForNavigation("/play/ABCD/remote?mode=remote", "/embed/room/ABCD")).toBe(
      "/embed/play/ABCD/remote?mode=remote",
    );
    expect(browserPathForNavigation("/room/ABCD", "/")).toBe("/room/ABCD");
  });
});
