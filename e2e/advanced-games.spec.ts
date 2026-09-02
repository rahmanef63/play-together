import { expect, type Locator, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  signUp,
  startGame,
  turboCircuit,
  useStick,
} from "./support/multiplayer";

test("all active 3D cartridges expose distinct shared-console controls and live WebGL gameplay", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    { key: turboCircuit, title: "Turbo Circuit", control: "Ready and start race" },
    { key: "sky-strike@0.2.6", title: "Sky Strike", control: "Fire cannon" },
    { key: "flight-trainer@0.2.6", title: "Flight Trainer", control: "Throttle up" },
  ] as const;
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
      await expect(frame.locator(".console-stick-svg, .console-face-svg").first()).toBeVisible();
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();

      if (game.title === "Turbo Circuit") {
        const turbo = frame.locator(".turbo-circuit");
        const carName = frame.locator(".turbo-setup__card--car .turbo-setup__name");
        const trackName = frame.locator(".turbo-setup__card--circuit .turbo-setup__name");
        await expect(frame.locator('[data-asset-state="ready"]')).toBeVisible({ timeout: 20_000 });
        await expect(trackName).toContainText("Neo Metro Circuit");
        await expect(carName).toContainText("Falcon R");
        await expect(frame.locator(".turbo-setup__mode")).toContainText("MANUAL THROTTLE");
        await expect(frame.locator(".turbo-setup__stats")).toContainText("BOOST");
        await expect(frame.getByRole("button", { name: "Accelerate" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Brake" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Hold drift" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Use item forward" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Use item backward" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Cycle camera" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Rescue kart to track" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Hold rear view" })).toBeVisible();
        await useStick(page, frame, "steer", 0.9, 0, 120);
        await expect(turbo).toHaveAttribute("data-car", "comet-gt");
        await useStick(page, frame, "steer", 0, 0.9, 120);
        await expect(turbo).toHaveAttribute("data-track", "cosmic-loop");
        await expect(trackName).toContainText("Cosmic Loop");
        const camera = frame.getByRole("button", { name: "Cycle camera" });
        await camera.click();
        await expect(turbo).toHaveAttribute("data-camera", "wide");
        await camera.click();
        await expect(turbo).toHaveAttribute("data-camera", "driver");
        await frame.getByRole("button", { name: game.control }).click();
        await expect(frame.locator(".turbo-setup__cta")).toHaveText("READY ✓");
        await expect(turbo).toHaveAttribute("data-phase", "racing", { timeout: 6_000 });
        const throttle = frame.getByRole("button", { name: "Accelerate" });
        await holdButton(page, throttle, 1_450);
        await expect
          .poll(
            async () => Number(await frame.locator(".turbo-speedometer__value").textContent()),
            { timeout: 4_000 },
          )
          .toBeGreaterThan(20);
        await expect(frame.locator(".turbo-cockpit")).toHaveAttribute("data-visible", "true");
        await expect(frame.locator(".turbo-nitro")).toContainText("COIN");
        const pause = frame.getByRole("button", { name: "Pause or resume race" });
        await pause.click();
        await expect(turbo).toHaveAttribute("data-paused", "true");
        await pause.click();
        await expect(turbo).toHaveAttribute("data-paused", "false");
      } else {
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
    }
  } finally {
    await closeContext(context);
  }
});

async function holdButton(_page: import("@playwright/test").Page, button: Locator, holdMs: number) {
  await button.click({ delay: holdMs });
}
