import { expect, test } from "@playwright/test";
import {
  clashArena,
  closeContext,
  createRoom,
  signUp,
  startGame,
  useStick,
} from "./support/multiplayer";

test("Clash Arena ships an original Tier 0 1v1 fighter with deterministic solo opposition", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await signUp(page, `Arena Fighter ${runId}`, `clash-${runId}@example.test`);
    const code = await createRoom(page, {
      name: `Clash Arena ${runId}`,
      gameKey: clashArena,
      maxPlayers: 1,
      visibility: "private",
    });
    await page.getByRole("button", { name: /Handheld console/ }).click();
    await startGame(page);
    const frame = page.frameLocator("iframe.game-frame");
    await expect(frame.locator(".handheld-screen canvas")).toBeVisible({ timeout: 20_000 });
    const controller = frame.locator('.builtin-controller[data-renderer="builtin"]');
    await expect(controller.locator(".console-control")).toHaveCount(6);
    for (const [id, face] of [
      ["jab", "a"],
      ["kick", "b"],
      ["strike", "x"],
      ["surge", "y"],
    ] as const)
      await expect(controller.locator(`[data-control-id="${id}"]`)).toHaveAttribute(
        "data-face",
        face,
      );
    await expect(
      controller.locator('[data-face="l1"], [data-face="r1"], [data-face="l2"], [data-face="r2"]'),
    ).toHaveCount(0);
    await expect(frame.getByText(/NOVA RIN/)).toBeVisible();
    await expect(frame.getByText(/KITE VALE/)).toBeVisible();
    await expect(frame.getByText(/CPU/)).toBeVisible();

    // Close distance with the single movement stick, then verify an attack changes authoritative HP.
    await useStick(page, frame, "move", -1, 0, 900);
    const before = await frame
      .locator("section div")
      .filter({ hasText: /KITE VALE/ })
      .first()
      .textContent();
    const jab = frame.getByRole("button", { name: "Jab; press with B to escape a throw" });
    await jab.click({ delay: 180 });
    await expect
      .poll(
        async () => {
          const after = await frame
            .locator("section div")
            .filter({ hasText: /KITE VALE/ })
            .first()
            .textContent();
          return after !== before;
        },
        { timeout: 4_000 },
      )
      .toBe(true);
    await expect(page.locator(".connection")).toHaveText("connected");
    await expect(page.locator(".play-error")).toHaveCount(0);
    await page.getByRole("button", { name: /Room/ }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
    await page.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(context);
  }
});
