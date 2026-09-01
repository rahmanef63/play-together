import { expect, test } from "@playwright/test";
import { closeContext, createRoom, signUp, startGame, useStick } from "./support/multiplayer";

test("advanced 3D cartridges expose distinct console controls and live WebGL gameplay", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    {
      key: "turbo-circuit@0.6.1",
      title: "Turbo Circuit",
      control: "Ready and start auto drive",
      delay: 80,
    },
    { key: "sky-strike@0.2.6", title: "Sky Strike", control: "Fire cannon", delay: 180 },
    { key: "flight-trainer@0.2.6", title: "Flight Trainer", control: "Throttle up", delay: 0 },
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
        const turbo = frame.locator(".turbo-circuit");
        const garage = frame.locator(".turbo-setup");
        const carName = frame.locator(".turbo-setup__card--car .turbo-setup__name");
        const circuitName = frame.locator(".turbo-setup__card--circuit .turbo-setup__name");
        await expect(frame.locator('[data-asset-state="ready"]')).toBeVisible({ timeout: 20_000 });
        await expect(garage).toContainText("SELECT & READY");
        await expect(circuitName).toContainText("Sunset Ring");
        await expect(carName).toContainText("Falcon R");
        await expect(frame.locator(".turbo-setup__map svg")).toBeVisible();
        await expect(frame.locator(".turbo-setup__stats")).toContainText("ACC");
        await expect(frame.locator(".turbo-setup__stats")).toContainText("GRIP");
        await expect(frame.locator(".turbo-setup__stats")).toContainText("BRAKE");
        await expect(frame.locator(".turbo-setup__mode")).toContainText("AUTO-THROTTLE");
        await expect(frame.locator(".turbo-setup__cta")).toHaveText("GO · READY UP");
        await expect(frame.locator(".turbo-speedometer")).toHaveCSS("opacity", "0");
        await expect(frame.getByRole("button", { name: "Accelerate" })).toHaveCount(0);
        await useStick(page, frame, "steer", 0.9, 0, 120);
        await expect(turbo).toHaveAttribute("data-car", "comet-gt");
        await expect(carName).toContainText("Comet GT");
        await useStick(page, frame, "steer", 0, 0.9, 120);
        await expect(turbo).toHaveAttribute("data-circuit", "harbor-bend");
        await expect(circuitName).toContainText("Harbor Bend");
        await frame.getByRole("button", { name: "Toggle chase or driver camera" }).click();
        await expect(turbo).toHaveAttribute("data-camera", "driver");
      }
      await expect(frame.locator(".handheld-controls")).toBeVisible({ timeout: 20_000 });
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible({
        timeout: 20_000,
      });
      const control = frame.getByRole("button", { name: game.control });
      await expect(control).toBeVisible({ timeout: 20_000 });
      await control.click({ delay: game.delay });
      if (game.title === "Turbo Circuit") {
        const turbo = frame.locator(".turbo-circuit");
        await expect(frame.locator(".turbo-setup__cta")).toHaveText("READY ✓");
        await expect(turbo).toHaveAttribute("data-phase", "racing", { timeout: 6_000 });
        await expect(frame.locator(".turbo-speedometer")).toHaveCSS("opacity", "1");
        await expect
          .poll(
            async () => Number(await frame.locator(".turbo-speedometer__value").textContent()),
            { timeout: 5_000 },
          )
          .toBeGreaterThan(20);
        const nitro = frame.getByRole("button", { name: "Nitro boost" });
        await expect(nitro).toBeVisible();
        await nitro.click({ delay: 420 });
        await expect(frame.locator(".turbo-nitro")).not.toHaveText("N₂O 100%", { timeout: 2_000 });
      } else {
        await page.waitForTimeout(450);
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
