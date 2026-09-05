import { expect, type Locator, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  flightTrainer,
  signUp,
  skyStrike,
  startGame,
  turboCircuit,
  useStick,
} from "./support/multiplayer";

test("all active 3D cartridges expose distinct shared-console controls and live WebGL gameplay", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    { key: turboCircuit, title: "Turbo Circuit", control: "Start ready or pause" },
    { key: skyStrike, title: "Sky Strike", control: "Fire cannon" },
    { key: flightTrainer, title: "Flight Trainer", control: "Throttle up" },
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
        await expect(frame.locator('[data-asset-state="procedural"]')).toBeVisible({
          timeout: 20_000,
        });
        await expect(trackName).toContainText("Neo Metro Circuit");
        await expect(carName).toContainText("Falcon R");
        await expect(frame.locator(".turbo-setup__mode")).toContainText("MANUAL THROTTLE");
        await expect(frame.locator(".turbo-setup__stats")).toContainText("BOOST");
        const controller = frame.locator('.builtin-controller[data-renderer="builtin"]');
        await expect(controller.locator(".console-control")).toHaveCount(10);
        for (const [id, face, action] of [
          ["gas", "a", "GAS"],
          ["brake", "b", "BRAKE"],
          ["item", "x", "ITEM"],
          ["rear-view", "y", "REAR"],
        ] as const) {
          const button = controller.locator(`[data-control-id="${id}"]`);
          await expect(button).toHaveAttribute("data-face", face);
          await expect(button.locator(".console-control__action-label")).toHaveText(action);
        }
        await expect(frame.getByRole("button", { name: "Accelerate" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Brake" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Use item ability" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Hold rear view" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Start ready or pause" })).toHaveText(
          "START",
        );
        for (const removed of ["throttle", "item-back", "pause"])
          await expect(controller.locator(`[data-control-id="${removed}"]`)).toHaveCount(0);
        for (const [id, face] of [
          ["camera", "l1"],
          ["drift", "r1"],
          ["rescue", "l2"],
          ["rear-item", "r2"],
        ]) {
          await expect(controller.locator(`[data-control-id="${id}"]`)).toHaveAttribute(
            "data-face",
            face,
          );
        }
        const sound = frame.getByRole("button", { name: "Toggle race sound" });
        await expect(sound).toHaveText("SOUND ON");
        await sound.click();
        await expect(sound).toHaveText("SOUND OFF");
        await sound.click();
        await expect(sound).toHaveText("SOUND ON");
        const minimap = frame.getByRole("button", { name: "Toggle race map size" });
        await expect(minimap).toHaveAttribute("data-expanded", "false");
        await minimap.click();
        await expect(minimap).toHaveAttribute("data-expanded", "true");
        await minimap.press("Enter");
        await expect(minimap).toHaveAttribute("data-expanded", "false");
        await useStick(page, frame, "steer", 0.9, 0, 120);
        await expect(turbo).toHaveAttribute("data-car", "comet-gt");
        await useStick(page, frame, "steer", 0, 0.9, 120);
        await expect(turbo).toHaveAttribute("data-track", "cosmic-loop");
        await expect(trackName).toContainText("Cosmic Loop");
        await expect(turbo).toHaveAttribute("data-camera", "chase");
        const start = frame.getByRole("button", { name: game.control });
        await start.click();
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
        await expect(frame.locator(".turbo-nitro")).toContainText("COIN");
        await start.click();
        await expect(turbo).toHaveAttribute("data-paused", "true");
        await start.click();
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
