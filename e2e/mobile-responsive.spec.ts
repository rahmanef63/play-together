import { expect, type Page, test } from "@playwright/test";
import { closeContext, createRoom, pong, signUp } from "./support/multiplayer";

test("mobile auth remains vertically scrollable on short phone viewports", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 480 } });
  const page = await context.newPage();
  try {
    for (const viewport of [
      { width: 390, height: 480 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Your phone is the console." })).toBeVisible();
      const auth = page.locator(".auth-page");
      await expect(auth).toHaveCSS("overflow-y", "auto");
      const before = await auth.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
      await auth.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(
        page.locator(".auth-card form").getByRole("button", { name: "Create account" }),
      ).toBeInViewport();
      expect(await auth.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await page.locator('input[name="password"]').focus();
      await expect(page.locator('input[name="password"]')).toBeInViewport();
    }
  } finally {
    await closeContext(context);
  }
});

test("mobile account menu exposes sign out and compact app routes stay width-safe", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await signUp(page, `Mobile QA ${runId}`, `mobile-${runId}@example.test`);
    const code = await createRoom(page, {
      name: `Mobile Room ${runId}`,
      gameKey: pong,
      maxPlayers: 2,
      visibility: "private",
    });
    const routes = ["/", "/rooms", `/room/${code}`, "/templates", "/developers", "/ops"];
    const viewports = [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 834, height: 1112 },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator(".app-dock")).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
        const width = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
        await assertScrollContracts(page);
      }
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.locator(".desktop-topbar")).toBeVisible();
    await expect(page.locator(".app-dock")).toBeHidden();
    await expect(page.locator(".mobile-account")).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/room/${code}`);
    await page.getByRole("button", { name: "Close room" }).click();
    await expect(page).toHaveURL("/");
    await page.getByRole("button", { name: "Open account menu" }).click();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Your phone is the console." })).toBeVisible();
  } finally {
    await closeContext(context);
  }
});

async function assertScrollContracts(page: Page) {
  const pageMetrics = await page.evaluate(() => ({
    bodyOverflow: getComputedStyle(document.body).overflow,
    viewportHeight: innerHeight,
    viewportWidth: innerWidth,
    main: (() => {
      const main = document.querySelector<HTMLElement>("main");
      if (!main) return null;
      const rect = main.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, width: rect.width };
    })(),
  }));
  expect(pageMetrics.bodyOverflow).toBe("hidden");
  if (pageMetrics.main) {
    expect(pageMetrics.main.width).toBeLessThanOrEqual(pageMetrics.viewportWidth + 1);
    expect(pageMetrics.main.bottom).toBeLessThanOrEqual(pageMetrics.viewportHeight + 1);
  }

  const scrollAreas = page.locator("[data-scroll-viewport]");
  for (let index = 0; index < (await scrollAreas.count()); index += 1) {
    const area = scrollAreas.nth(index);
    const metrics = await area.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        overflowY: style.overflowY,
        left: rect.left,
        right: rect.right,
        panel: (() => {
          const panel = element.closest<HTMLElement>(".panel");
          if (!panel) return null;
          const panelRect = panel.getBoundingClientRect();
          return { left: panelRect.left, right: panelRect.right };
        })(),
        insideHorizontalSnap: Boolean(element.closest(".horizontal-snap")),
      };
    });
    expect(metrics.clientWidth).toBeGreaterThan(0);
    expect(metrics.clientHeight).toBeGreaterThan(0);
    expect(["auto", "scroll"]).toContain(metrics.overflowY);
    if (metrics.insideHorizontalSnap && metrics.panel) {
      expect(metrics.left).toBeGreaterThanOrEqual(metrics.panel.left - 1);
      expect(metrics.right).toBeLessThanOrEqual(metrics.panel.right + 1);
    } else {
      expect(metrics.left).toBeGreaterThanOrEqual(-1);
      expect(metrics.right).toBeLessThanOrEqual(pageMetrics.viewportWidth + 1);
    }
    if (metrics.scrollHeight > metrics.clientHeight + 2) {
      const scrolled = await area.evaluate((element) => {
        if (element.scrollHeight <= element.clientHeight + 2) return null;
        element.scrollTop = element.scrollHeight;
        const top = element.scrollTop;
        element.scrollTop = 0;
        return top;
      });
      if (scrolled !== null) expect(scrolled).toBeGreaterThan(0);
    }
  }

  const snaps = page.locator(".horizontal-snap");
  for (let index = 0; index < (await snaps.count()); index += 1) {
    const style = await snaps.nth(index).evaluate((element) => {
      const computed = getComputedStyle(element);
      return { overflowX: computed.overflowX, snap: computed.scrollSnapType };
    });
    expect(style.overflowX).toBe("auto");
    expect(style.snap).toContain("x mandatory");
  }
}
