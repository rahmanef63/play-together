import { expect, test } from "@playwright/test";
import { closeContext, createRoom, signUp, startGame } from "./support/multiplayer";

test("arcade and touch remotes use the shared SVG controller system", async ({ browser }) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await signUp(page, `Controller Layout ${runId}`, `controller-layout-${runId}@example.test`);
    for (const game of [
      {
        key: "tap-race@0.4.0",
        layout: "arcade",
        control: "Tap to race",
        visual: ".console-face-svg",
      },
      {
        key: "target-blast@0.3.0",
        layout: "touch",
        control: "Target aiming pad",
        visual: ".console-touch-svg",
      },
    ] as const) {
      const code = await createRoom(page, {
        name: `${game.layout} ${runId}`,
        gameKey: game.key,
        maxPlayers: 1,
        visibility: "private",
      });
      await page.goto(`/play/${code}/controller?mode=remote`);
      await startGame(page);
      const frame = page.frameLocator("iframe.game-frame");
      await expect(frame.locator(".console-controller-svg")).toBeVisible();
      await expect(frame.locator(`.builtin-controller--${game.layout}`)).toBeVisible();
      await expect(frame.getByRole("button", { name: game.control })).toBeVisible();
      await expect(frame.locator(game.visual)).toBeVisible();
      const geometry = await frame.locator("body").evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
      expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 1);
      await page.getByRole("button", { name: /Room/ }).click();
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    }
  } finally {
    await closeContext(context);
  }
});
