import { expect, test } from "@playwright/test";
import { closeContext, signUp } from "./support/multiplayer";

test("TV diagnostics remain readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  try {
    await page.goto("/tv.html");
    await expect(page.getByRole("heading", { name: "Let’s check this screen." })).toBeVisible();
    await expect(page.getByText("JavaScript is disabled.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open TV mode" })).toBeVisible();
  } finally {
    await closeContext(context);
  }
});

test("TV diagnostics report missing graphics rather than pretending a user agent enables them", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof getContext>) {
      return args[0] === "webgl2" ? null : getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto("/tv.html");
  await expect(page.locator("#tv-checks")).toContainText("WebGL 2 graphics: Not available");
  await expect(page.locator("#tv-browser")).not.toBeEmpty();
});

test("console home stays in one viewport and switches panels with keyboard-accessible tabs", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(),
    id = Date.now();
  try {
    await signUp(page, `Viewport ${id}`, `viewport-${id}@example.test`);
    for (const size of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      const tabs = page.locator(".console-panel-tabs");
      await tabs.getByRole("button", { name: "Play", exact: true }).click();
      await expect(page.locator(".create-panel")).toBeVisible();
      await expect(page.locator(".rooms-panel")).toBeHidden();
      const metrics = await page.evaluate(() => {
        const main = document.querySelector("main")!.getBoundingClientRect();
        const panel = document.querySelector(".create-panel")!.getBoundingClientRect();
        return {
          main: { bottom: main.bottom, width: main.width },
          panel: { left: panel.left, right: panel.right, height: panel.height },
          width: innerWidth,
          height: innerHeight,
          documentWidth: document.documentElement.scrollWidth,
        };
      });
      expect(metrics.main.bottom).toBeLessThanOrEqual(metrics.height + 1);
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.width + 1);
      expect(metrics.panel.left).toBeGreaterThanOrEqual(0);
      expect(metrics.panel.right).toBeLessThanOrEqual(metrics.width + 1);
      expect(metrics.panel.height).toBeGreaterThan(80);
      await tabs.getByRole("button", { name: "Play", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(tabs.getByRole("button", { name: "Rooms", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator(".rooms-panel")).toBeVisible();
      await expect(page.locator(".create-panel")).toBeHidden();
    }
  } finally {
    await closeContext(context);
  }
});
