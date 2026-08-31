import { expect, test } from "@playwright/test";
import { closeContext, createRoom, signUp, startGame } from "./support/multiplayer";

test("advanced 3D cartridges expose distinct console controls and live WebGL gameplay", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    { key: "turbo-circuit@0.4.1", title: "Turbo Circuit", control: "Accelerate", delay: 900 },
    { key: "sky-strike@0.2.4", title: "Sky Strike", control: "Fire cannon", delay: 180 },
    { key: "flight-trainer@0.2.4", title: "Flight Trainer", control: "Throttle up", delay: 0 },
  ];
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await signUp(page, `3D Pilot ${runId}`, `advanced-${runId}@example.test`);
    for (const game of cases) {
      const code = await createRoom(page, {
        name: `${game.title} ${runId}`,
        gameKey: game.key,
        maxPlayers: 1,
        visibility: "private",
      });
      await page.getByRole("button", { name: /Handheld console/ }).click();
      await startGame(page);
      await expect(page.locator(".play-toolbar strong")).toContainText(game.title, {
        timeout: 20_000,
      });
      const frame = page.frameLocator("iframe.game-frame");
      await expect(frame.locator(".handheld-screen canvas")).toBeVisible({ timeout: 20_000 });
      if (game.title === "Turbo Circuit") {
        await expect(frame.locator('[data-asset-state="ready"]')).toBeVisible({ timeout: 20_000 });
      }
      await expect(frame.locator(".handheld-controls")).toBeVisible({ timeout: 20_000 });
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible({
        timeout: 20_000,
      });
      const control = frame.getByRole("button", { name: game.control });
      await expect(control).toBeVisible({ timeout: 20_000 });
      await control.click({ delay: game.delay });
      await page.waitForTimeout(450);
      await expect(page.locator(".connection")).toHaveText("connected");
      await expect(page.locator(".play-error")).toHaveCount(0);
      await page.getByRole("button", { name: /Room/ }).click();
      await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    }
  } finally {
    await closeContext(context);
  }
});
