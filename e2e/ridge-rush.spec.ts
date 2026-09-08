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
      ["pedal", "a", "PEDAL / SPRINT"],
      ["brake", "b", "BRAKE / SLIDE"],
      ["jump", "x", "HOP / TRICK"],
      ["attack-look", "y", "ATTACK / LOOK"],
    ] as const) {
      const control = controller.locator(`[data-control-id="${id}"]`);
      await expect(control).toHaveAttribute("data-face", face);
      await expect(control).toBeVisible();
      await expect(control.locator(".console-control__action-label")).toHaveText(action);
    }
    await frame.getByRole("button", { name: "How to play", exact: true }).click();
    await expect(frame.getByRole("dialog")).toContainText(/pedal/i);
    await expect(frame.getByRole("dialog")).toContainText(/sprint/i);
    await frame.getByRole("button", { name: "Close how to play" }).click();
    await expect(
      controller.locator('[data-face="l1"], [data-face="r1"], [data-face="l2"], [data-face="r2"]'),
    ).toHaveCount(0);
    const start = frame.getByRole("button", { name: "Ready or request rematch" });
    await start.click();
    // The authoritative server unit test verifies the exact 3-second countdown. On a
    // remote production connection the first snapshot may arrive after that transient
    // state, so the browser contract is simply that START leaves the lobby promptly.
    await expect(frame.getByText("PRESS START")).toHaveCount(0, { timeout: 5_000 });

    await expect(frame.locator(".ridge-hud__coach")).toBeVisible();
    await expect(frame.locator(".ridge-hud__coach")).not.toBeEmpty();
    const speed = frame.locator(".ridge-hud__speed > strong");
    const ridgeStatus = frame.locator(".ridge-hud__center");
    const pedal = frame.getByRole("button", { name: /Pedal; quick double-tap/i });
    await pedal.focus();
    await page.keyboard.down("Space");
    await page.waitForTimeout(90);
    await page.keyboard.up("Space");
    await page.waitForTimeout(110);
    await page.keyboard.down("Space");
    try {
      await expect(pedal).toHaveAttribute("aria-pressed", "true");
      await expect(ridgeStatus).toHaveText("SPRINT", { timeout: 1_000 });
      await expect
        .poll(() => speed.textContent().then((text) => Number.parseInt(text ?? "0", 10)), {
          timeout: 8_000,
        })
        .toBeGreaterThan(28);

      // Exercise the bunny-hop + directional air-style on the opening straight, before
      // the slide test can move the rider toward the trail edge. A trick is not valid
      // while recovering from a crash, so keep this gesture in a stable riding state.
      await expect(ridgeStatus).not.toHaveText("RECOVERING");
      await page.keyboard.down("KeyX");
      await page.waitForTimeout(100);
      await page.keyboard.up("KeyX");
      await page.waitForTimeout(100);
      await page.keyboard.down("ArrowLeft");
      await page.keyboard.down("KeyX");
      try {
        await expect(ridgeStatus).toContainText("LEFT SPIN", { timeout: 2_500 });
      } finally {
        await page.keyboard.up("KeyX");
        await page.keyboard.up("ArrowLeft");
      }
      await expect(ridgeStatus).not.toContainText(/LEFT SPIN|^AIR /, { timeout: 3_000 });
      await expect
        .poll(() => speed.textContent().then((text) => Number.parseInt(text ?? "0", 10)), {
          timeout: 6_000,
        })
        .toBeGreaterThan(28);

      const rollingSpeed = Number.parseInt((await speed.textContent()) ?? "0", 10);
      expect(rollingSpeed).toBeGreaterThan(28);
      const brake = frame.getByRole("button", { name: /Brake; hard steer slides/i });
      await brake.focus();
      await page.keyboard.down("ArrowLeft");
      await page.keyboard.down("ShiftLeft");
      try {
        await expect(brake).toHaveAttribute("aria-pressed", "true");
        await expect(ridgeStatus).toHaveText("POWER SLIDE", { timeout: 1_000 });
        await expect
          .poll(() => speed.textContent().then((text) => Number.parseInt(text ?? "0", 10)), {
            timeout: 4_000,
          })
          .toBeLessThan(rollingSpeed);
      } finally {
        await page.keyboard.up("ShiftLeft");
        await page.keyboard.up("ArrowLeft");
      }
      await expect(brake).toHaveAttribute("aria-pressed", "false");
      await expect
        .poll(() => speed.textContent().then((text) => Number.parseInt(text ?? "0", 10)), {
          timeout: 6_000,
        })
        .toBeGreaterThan(28);
    } finally {
      await page.keyboard.up("Space");
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
