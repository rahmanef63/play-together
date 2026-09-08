import { expect, type FrameLocator, type Page } from "@playwright/test";
import { useStick } from "./multiplayer";

export async function verifyTurboPlay(page: Page, frame: FrameLocator) {
  const turbo = frame.locator(".turbo-circuit");
  const carName = frame.locator(".turbo-setup__card--car .turbo-setup__name");
  const trackName = frame.locator(".turbo-setup__card--circuit .turbo-setup__name");
  await expect(frame.locator('[data-asset-state="procedural"]')).toBeVisible({
    timeout: 20_000,
  });
  await expect(trackName).toContainText("Neo Metro Circuit");
  await expect(carName).toContainText("Falcon R");
  await expect(frame.locator(".turbo-setup__mode")).toContainText("TAP A TO CRUISE");
  await expect(frame.locator(".turbo-setup__stats")).toContainText("BOOST");
  await verifyCompactScreens(page, frame, "setup");
  const controller = frame.locator('.builtin-controller[data-renderer="builtin"]');
  await expect(controller.locator(".console-control")).toHaveCount(10);
  for (const [id, face, action] of [
    ["gas", "a", "GO / CRUISE"],
    ["brake", "b", "BRAKE / DRIFT"],
    ["item", "x", "ITEM"],
    ["rear-view", "y", "REAR"],
  ] as const) {
    const button = controller.locator(`[data-control-id="${id}"]`);
    await expect(button).toHaveAttribute("data-face", face);
    await expect(button.locator(".console-control__action-label")).toHaveText(action);
  }
  await expect(
    frame.getByRole("button", {
      name: "Tap gas once to cruise; brake cancels cruise; tap gas again to resume",
    }),
  ).toBeVisible();
  await expect(frame.locator('[data-control-id="brake"]')).toBeVisible();
  await expect(frame.getByRole("button", { name: "Use item ability", exact: true })).toBeVisible();
  await expect(frame.getByRole("button", { name: "Hold rear view", exact: true })).toBeVisible();
  await expect(frame.getByRole("button", { name: "Start ready or pause", exact: true })).toHaveText(
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
    const shoulder = controller.locator(`[data-control-id="${id}"]`);
    await expect(shoulder).toHaveAttribute("data-face", face);
    await expect(shoulder).toBeHidden();
  }
  await useStick(page, frame, "steer", 0.9, 0, 120);
  await expect(turbo).toHaveAttribute("data-car", "comet-gt");
  await useStick(page, frame, "steer", 0, 0.9, 120);
  await expect(turbo).toHaveAttribute("data-track", "cosmic-loop");
  await expect(trackName).toContainText("Cosmic Loop");
  await expect(turbo).toHaveAttribute("data-camera", "chase");
  const start = frame.getByRole("button", { name: "Start ready or pause" });
  await start.click();
  await expect(frame.locator(".turbo-setup__cta")).toHaveText("READY ✓");
  await expect(turbo).toHaveAttribute("data-phase", "racing", { timeout: 6_000 });
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
  const throttle = frame.getByRole("button", {
    name: "Tap gas once to cruise; brake cancels cruise; tap gas again to resume",
  });
  await throttle.click();
  await expect(throttle).toHaveAttribute("aria-pressed", "false");
  await expect(frame.locator(".turbo-camera")).toContainText("CRUISE ON");
  await expect
    .poll(async () => Number(await frame.locator(".turbo-speedometer__value").textContent()), {
      timeout: 4000,
    })
    .toBeGreaterThan(20);
  const brake = frame.locator('[data-control-id="brake"]');
  await brake.hover();
  await page.mouse.down();
  try {
    await expect(frame.locator(".turbo-camera")).not.toContainText("CRUISE ON");
    await expect(frame.locator(".turbo-nitro")).toContainText("RECOVERING", { timeout: 5000 });
  } finally {
    await page.mouse.up();
  }
  await expect(frame.locator(".turbo-speedometer__value")).toHaveText("0");
  await expect(frame.locator(".turbo-nitro")).toContainText("COIN");
  await start.click();
  await expect(turbo).toHaveAttribute("data-paused", "true");
  await start.click();
  await expect(turbo).toHaveAttribute("data-paused", "false");
  await verifyCompactScreens(page, frame, "racing");
}

async function verifyCompactScreens(page: Page, frame: FrameLocator, phase: string) {
  for (const viewport of [
    { width: 667, height: 280 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() =>
        frame.locator(".turbo-circuit").evaluate((host, phase) => {
          const screen = host.closest(".handheld-screen")!.getBoundingClientRect();
          const selectors =
            phase === "setup"
              ? [".turbo-setup__help", ".turbo-setup__footer"]
              : [".turbo-race-status", ".turbo-speedometer", ".turbo-nitro", ".turbo-minimap"];
          return selectors.filter((selector) => {
            const rect = host.querySelector(selector)!.getBoundingClientRect();
            return (
              rect.left < screen.left - 2 ||
              rect.right > screen.right + 2 ||
              rect.top < screen.top - 2 ||
              rect.bottom > screen.bottom + 2
            );
          });
        }, phase),
      )
      .toEqual([]);
  }
}
