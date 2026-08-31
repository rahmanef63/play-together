import { expect, test } from "@playwright/test";
import { closeContext, signUp } from "./support/multiplayer";

test("ops console owns panel scroll areas and stays bounded on mobile", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    await signUp(page, `Ops ${runId}`, `ops-${runId}@example.test`);
    await page.goto("/ops");
    await expect(page.getByRole("heading", { name: "Platform operations" })).toBeVisible();

    const hero = page.locator(
      '.ops-console-overview__art img[src="/assets/ui/ops/ops-hero-control-room.webp"]',
    );
    await expect(hero).toBeVisible();
    expect(
      await hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    ).toBe(true);

    const catalogScroll = page.locator(".ops-catalog-panel .scroll-area__viewport");
    const architectureScroll = page.locator(".ops-architecture-panel .scroll-area__viewport");
    await expect(catalogScroll).toBeVisible();
    await expect(architectureScroll).toBeVisible();
    expect(await catalogScroll.evaluate((node) => getComputedStyle(node).overflowY)).toBe("auto");
    expect(await architectureScroll.evaluate((node) => getComputedStyle(node).overflowY)).toBe(
      "auto",
    );

    const catalogMetrics = await catalogScroll.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }));
    expect(catalogMetrics.scrollHeight).toBeGreaterThan(catalogMetrics.clientHeight);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".ops-catalog-panel")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1);
  } finally {
    await closeContext(context);
  }
});
