import { expect, test } from "@playwright/test";
import {
  clashArena,
  closeContext,
  createRoom,
  signUp,
  startGame,
  useStick,
} from "./support/multiplayer";

test("Clash Arena selects a canonical fighter before entering deterministic Tier 0 combat", async ({
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
    ] as const) {
      await expect(controller.locator(`[data-control-id="${id}"]`)).toHaveAttribute(
        "data-face",
        face,
      );
    }
    await expect(
      controller.locator('[data-face="l1"], [data-face="r1"], [data-face="l2"], [data-face="r2"]'),
    ).toHaveCount(0);

    const selectFlow = frame.locator('.clash-flow[data-phase="select"]');
    await expect(selectFlow).toBeVisible();
    await expect(selectFlow.getByText("CHOOSE YOUR FIGHTER")).toBeVisible();
    await expect(selectFlow.getByText("NOVA RIN", { exact: true })).toBeVisible();
    await expect(selectFlow.getByText("KITE VALE", { exact: true })).toBeVisible();
    await expect(selectFlow.getByText("CPU", { exact: true })).toBeVisible();
    const p1 = selectFlow.locator(".clash-flow__slot").first();
    const initialCharacter = await p1.getAttribute("data-character");
    expect(initialCharacter).toMatch(/nova-rin|kite-vale/);
    await useStick(page, frame, "move", 1, 0, 160);
    await expect
      .poll(() => p1.getAttribute("data-character"), { timeout: 3_000 })
      .not.toBe(initialCharacter);
    await expect(p1).toHaveAttribute("data-ready", "false");

    await frame
      .getByRole("button", {
        name: "Select fighter before match; jab during fight; press with B to escape a throw",
      })
      .click({ delay: 100 });
    const intro = frame.locator('.clash-flow[data-phase="intro"]');
    await expect(intro).toBeVisible();
    await expect(intro).toContainText(/VERSUS|ROUND 1/);
    await expect(frame.locator(".clash-flow")).toBeHidden({ timeout: 5_000 });
    await expect(frame.locator(".clash-arena")).toHaveAttribute("data-phase", "fight");
    await expect(frame.locator(".clash-arena")).toHaveAttribute("data-fighter-asset-format", "glb");
    await expect(frame.locator(".clash-arena")).toHaveAttribute("data-fighter-assets", "2", {
      timeout: 8_000,
    });

    await useStick(page, frame, "move", -1, 0, 900);
    const opponentHp = frame.locator(".clash-fighter-hud--right .clash-meter--hp i");
    const before = await opponentHp.evaluate((element) => (element as HTMLElement).style.width);
    await frame
      .getByRole("button", {
        name: "Select fighter before match; jab during fight; press with B to escape a throw",
      })
      .click({ delay: 180 });
    await expect
      .poll(async () => opponentHp.evaluate((element) => (element as HTMLElement).style.width), {
        timeout: 4_000,
      })
      .not.toBe(before);
    await expect(page.locator(".connection")).toHaveText("connected");
    await expect(page.locator(".play-error")).toHaveCount(0);
    await page.getByRole("button", { name: /Room/ }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
    await page.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(context);
  }
});
