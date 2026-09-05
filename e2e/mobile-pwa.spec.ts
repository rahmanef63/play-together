import { expect, test } from "@playwright/test";
import { closeContext, signUp } from "./support/multiplayer";

test("mobile PWA shell uses full-width snap cards, native dock, and live submission docs", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  try {
    await signUp(page, `PWA Mobile ${runId}`, `pwa-mobile-${runId}@example.test`);
    const dock = page.locator(".app-dock");
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("button")).toHaveCount(5);
    await expect(dock.getByRole("button", { name: /Home/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Game previews are populated from the async published-game catalog. Wait for the real
    // rail instead of racing the skeleton-to-content transition before measuring layout.
    await expect(page.locator(".game-picker")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".game-picker img").first()).toBeVisible({ timeout: 20_000 });

    const layout = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".lobby-grid");
      const create = document.querySelector<HTMLElement>(".create-panel");
      const rooms = document.querySelector<HTMLElement>(".rooms-panel");
      const games = document.querySelector<HTMLElement>(".game-picker");
      const dockElement = document.querySelector<HTMLElement>(".app-dock");
      const dockSurface = document.querySelector<HTMLElement>(".app-dock__surface");
      if (!rail || !create || !rooms || !games || !dockElement || !dockSurface) {
        throw new Error("Mobile PWA elements missing");
      }
      const createRect = create.getBoundingClientRect();
      const roomsRect = rooms.getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        railWidth: rail.clientWidth,
        railHeight: rail.clientHeight,
        railScrollWidth: rail.scrollWidth,
        createWidth: createRect.width,
        roomsWidth: roomsRect.width,
        gameRailWidth: games.clientWidth,
        gameRailScrollWidth: games.scrollWidth,
        gameScrollbar: getComputedStyle(games).scrollbarWidth,
        dockPosition: getComputedStyle(dockElement).position,
        dockBackground: getComputedStyle(dockSurface).backgroundColor,
        dockRadius: Number.parseFloat(getComputedStyle(dockSurface).borderRadius),
      };
    });
    expect(layout.createWidth).toBeGreaterThanOrEqual(layout.width - 32);
    expect(layout.roomsWidth).toBe(0); // Inactive panels are intentionally hidden behind explicit tabs.
    expect(layout.railHeight).toBeGreaterThan(300);
    expect(layout.railScrollWidth).toBeLessThanOrEqual(layout.railWidth + 1);
    expect(layout.gameRailScrollWidth).toBeGreaterThan(layout.gameRailWidth);
    expect(layout.gameScrollbar).toBe("none");
    expect(layout.dockPosition).toBe("fixed");
    expect(layout.dockBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(layout.dockRadius).toBe(0); // Navigation is a fixed console edge, not a floating glass pill.

    await dock.getByRole("button", { name: /Rooms/ }).click();
    await expect(page).toHaveURL("/rooms");
    await expect(page.locator(".app-shell--rooms .rooms-panel")).toBeVisible();

    await page
      .locator(".app-dock")
      .getByRole("button", { name: /Submit/ })
      .click();
    await expect(page).toHaveURL("/developers");
    await expect(page.locator(".developer-page")).toBeVisible();
    const copyButton = page.getByRole("button", { name: "Copy full submission prompt" });
    await expect(copyButton).toBeEnabled({ timeout: 10_000 });
    await copyButton.click();
    await expect(page.getByRole("button", { name: "Prompt copied" })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("You are adding one new multiplayer game");
    expect(clipboard).toContain("game_publish");
    expect(clipboard).toContain("deploy-managed");
  } finally {
    await closeContext(context);
  }
});
