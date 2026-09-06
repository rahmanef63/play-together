import { expect, test } from "@playwright/test";
import { closeContext, createRoom, ridgeRush, signUp, startGame } from "./support/multiplayer";

test("Ridge Rush provides a distinct downhill race with Tier 0 controls and extreme mountain physics", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await signUp(page, `Ridge Rider ${runId}`, `ridge-${runId}@example.test`);
    const code = await createRoom(page, {
      name: `Ridge Rush ${runId}`,
      gameKey: ridgeRush,
      maxPlayers: 1,
      visibility: "private",
    });
    await page.getByRole("button", { name: /Handheld console/ }).click();
    await startGame(page);
    const frame = page.frameLocator("iframe.game-frame");
    const race = frame.locator(".ridge-rush");
    await expect(race).toBeVisible({ timeout: 20_000 });
    await expect(frame.locator(".handheld-screen canvas")).toBeVisible();
    const controller = frame.locator('.builtin-controller[data-renderer="builtin"]');
    await expect(controller.locator(".console-control")).toHaveCount(6);
    for (const [id, face, action] of [
      ["pedal", "a", "PEDAL"],
      ["brake", "b", "BRAKE"],
      ["jump", "x", "JUMP"],
      ["rear-view", "y", "REAR"],
    ] as const) {
      const control = controller.locator(`[data-control-id="${id}"]`);
      await expect(control).toHaveAttribute("data-face", face);
      await expect(control.getByText(action, { exact: true })).toBeVisible();
    }
    await expect(
      controller.locator('[data-face="l1"], [data-face="r1"], [data-face="l2"], [data-face="r2"]'),
    ).toHaveCount(0);
    const start = frame.getByRole("button", { name: "Ready or request rematch" });
    await start.click();
    const countdown = frame.getByText(/^3$|^2$|^1$/);
    await expect(countdown).toBeVisible({ timeout: 2_000 });
    await expect(frame.getByText("PRESS START")).toHaveCount(0, { timeout: 5_000 });
    await expect(countdown).toHaveCount(0, { timeout: 5_000 });

    const speed = frame.locator(".ridge-hud__speed > strong");
    const pedal = frame.getByRole("button", { name: "Pedal" });
    await pedal.focus();
    await page.keyboard.down("Space");
    try {
      await expect(pedal).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() => speed.textContent().then((text) => Number.parseInt(text ?? "0", 10)), {
          timeout: 8_000,
        })
        .toBeGreaterThan(28);
      await page.keyboard.down("KeyX");
      try {
        await expect(frame.getByText(/^AIR /)).toBeVisible({ timeout: 1_500 });
      } finally {
        await page.keyboard.up("KeyX");
      }
      await expect(frame.getByText(/^AIR /)).toHaveCount(0, { timeout: 2_500 });
    } finally {
      await page.keyboard.up("Space");
    }
    const rollingSpeed = Number.parseInt((await speed.textContent()) ?? "0", 10);
    await frame.getByRole("button", { name: "Brake" }).focus();
    await page.keyboard.down("ShiftLeft");
    try {
      await expect
        .poll(() => speed.textContent().then((text) => Number.parseInt(text ?? "0", 10)), {
          timeout: 4_000,
        })
        .toBeLessThan(rollingSpeed);
    } finally {
      await page.keyboard.up("ShiftLeft");
    }
    await expect(frame.getByText(/1ST|2ND|3RD|4TH/)).toBeVisible();
    await expect(page.locator(".connection")).toHaveText("connected");
    await expect(page.locator(".play-error")).toHaveCount(0);
    await page.getByRole("button", { name: /Room/ }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
    await page.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(context);
  }
});
