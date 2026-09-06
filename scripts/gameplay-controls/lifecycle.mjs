import assert from "node:assert/strict";

export async function verifyControllerLifecycle(page, flight, results) {
  await page.evaluate((config) => {
    window.qa.dispose();
    const shell = window.qa.mountConsoleShell(document.getElementById("game-root"), {
      mode: "remote",
      preset: "flight",
      title: "Input lifecycle test",
    });
    const dispose = window.qa.mountBuiltinController(
      shell.controls,
      config.controller.console,
      {
        playerId: "qa",
        mode: "remote",
        sendInput: (input) => window.qa.inputs.push(input),
        subscribe: () => () => {},
      },
      {
        gameTitle: config.game.title,
        gameDescription: config.game.description,
        onMenu: () => window.qa.menus++,
      },
    );
    window.qa.inputs = [];
    window.qa.dispose = () => {
      dispose();
      shell.dispose();
    };
  }, flight);
  const holdButton = page.locator(".console-control--button:visible").first();
  assert.equal(
    await holdButton.evaluate((element) => getComputedStyle(element).userSelect),
    "none",
  );
  for (const type of ["selectstart", "contextmenu", "dragstart"])
    assert.equal(
      await holdButton.evaluate(
        (element, eventType) =>
          element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true })),
        type,
      ),
      false,
      `${type} must be cancelled on hold controls`,
    );
  await holdButton.hover();
  await page.mouse.down();
  await page.waitForTimeout(420);
  assert.equal(await page.evaluate(() => window.getSelection()?.toString() ?? ""), "");
  await page.mouse.up();
  await page.getByRole("button", { name: "How to play" }).click();
  await page.getByRole("dialog", { name: /how to play/i }).waitFor({ state: "visible" });
  assert.equal(await page.locator('.console-how-to [data-advanced-legend="true"]').count(), 1);
  assert.equal(await page.locator('[data-shoulder="true"]:visible').count(), 0);
  await page.getByRole("button", { name: "Toggle advanced controls" }).click();
  assert((await page.locator('[data-shoulder="true"]:visible').count()) > 0);
  await page.getByRole("button", { name: "Close how to play" }).click();
  const menuBefore = await page.evaluate(() => window.qa.menus);
  await page.getByRole("button", { name: "Open game menu" }).click();
  assert.equal(await page.evaluate(() => window.qa.menus), menuBefore + 1);
  results.push({ name: "browser-system-actions-hold-selection-advanced-toggle", issues: [] });
  await page.keyboard.down("q");
  await page.keyboard.down("e");
  await page.keyboard.up("e");
  assert.equal(await page.evaluate(() => window.qa.inputs.at(-1)?.yaw), -1);
  await page.keyboard.up("q");
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("a");
  await page.keyboard.up("ArrowLeft");
  assert.equal(await page.evaluate(() => window.qa.inputs.at(-1)?.roll), -1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(await page.evaluate(() => window.qa.inputs.at(-1)?.roll), 0);
  await page.keyboard.up("a");
  results.push({ name: "browser-keyboard-alias-opposing-shoulder-blur", issues: [] });
}
