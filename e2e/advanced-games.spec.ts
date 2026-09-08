import { expect, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  flightTrainer,
  signUp,
  skyStrike,
  startGame,
  turboCircuit,
} from "./support/multiplayer";
import { verifyTurboPlay } from "./support/turboCircuit";

const cases = [
  { key: turboCircuit, title: "Turbo Circuit", control: "Start ready or pause" },
  { key: skyStrike, title: "Sky Strike", control: "Fire cannon" },
  { key: flightTrainer, title: "Flight Trainer", control: "Throttle up" },
] as const;

for (const game of cases) {
  test(`${game.title} exposes distinct shared-console controls and live WebGL gameplay`, async ({
    browser,
  }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const gameId = game.key.split("@")[0];
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await context.newPage();
    try {
      await signUp(page, `3D Pilot ${runId}`, `advanced-${gameId}-${runId}@example.test`);
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
      await expect(frame.locator(".console-stick-svg, .console-face-svg").first()).toBeVisible();
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();

      if (game.title === "Turbo Circuit") {
        await verifyTurboPlay(page, frame);
      } else {
        const guide = frame.locator(
          game.title === "Flight Trainer" ? ".flight-navigation" : ".sky-target-guide",
        );
        await expect(guide).toBeVisible();
        await expect(guide).toContainText(
          game.title === "Flight Trainer" ? /GATE|RUNWAY/ : /TARGET|LOCK/,
        );
        const bounds = await guide.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const screen = el.closest(".handheld-screen")?.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            screenTop: screen?.top ?? 0,
            screenBottom: screen?.bottom ?? innerHeight,
          };
        });
        expect(bounds.top).toBeGreaterThanOrEqual(bounds.screenTop - 1);
        expect(bounds.bottom).toBeLessThanOrEqual(bounds.screenBottom + 1);
        const control = frame.getByRole("button", { name: game.control });
        await expect(control).toBeVisible({ timeout: 20_000 });
        await control.click({ delay: game.title === "Sky Strike" ? 160 : 50 });
      }

      await expect(page.locator(".connection")).toHaveText("connected");
      await expect(page.locator(".play-error")).toHaveCount(0);
      await page.getByRole("button", { name: /Room/ }).click();
      await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    } finally {
      await closeContext(context);
    }
  });
}
