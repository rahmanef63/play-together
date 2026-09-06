import assert from "node:assert/strict";

export async function verifyControllerLifecycle(page, flight, results) {
  await mountFlightHarness(page, flight);
  const holdButton = page
    .locator('.console-control--button[data-canonical-face="true"]:visible')
    .first();
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
  const visualDescendants = holdButton.locator(
    ".console-face-svg__glyph, .console-control__action-label",
  );
  assert.equal(
    await visualDescendants.count(),
    2,
    "canonical face button must expose glyph + action label",
  );
  for (let index = 0; index < 2; index++) {
    const descendant = visualDescendants.nth(index);
    const styles = await descendant.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        userSelect: style.userSelect,
        pointerEvents: style.pointerEvents,
        webkitUserDrag: style.getPropertyValue("-webkit-user-drag"),
      };
    });
    assert.equal(styles.userSelect, "none", "nested button text must never be selectable");
    assert.equal(styles.pointerEvents, "none", "visual label/glyph must not become a touch target");
    assert.equal(
      styles.webkitUserDrag,
      "none",
      "visual label/glyph must not start native dragging",
    );
    const blockedBeforeTarget = await descendant.evaluate((element) => {
      const stopAtTarget = (event) => event.stopPropagation();
      element.addEventListener("selectstart", stopAtTarget, { once: true });
      const event = new Event("selectstart", { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(
      blockedBeforeTarget,
      true,
      "selection must be cancelled in capture phase before a nested target can stop bubbling",
    );
    for (const type of ["contextmenu", "dragstart"])
      assert.equal(
        await descendant.evaluate(
          (element, eventType) =>
            element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true })),
          type,
        ),
        false,
        `${type} from nested button content must be cancelled`,
      );
  }
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

export async function verifyMobileTouchHold(browser, origin, flight, results) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    await page.goto(`${origin}/__controller_qa__`);
    await page.evaluate(async () => {
      await import("/src/frame/styles/index.css");
      const { mountConsoleShell } = await import("/src/frame/consoleShell.ts");
      const { mountBuiltinController } = await import("/src/frame/builtinController.ts");
      window.qa = {
        mountConsoleShell,
        mountBuiltinController,
        inputs: [],
        statuses: [],
        menus: 0,
        dispose: () => {},
      };
    });
    const session = await page.context().newCDPSession(page);
    for (const viewport of [
      { width: 390, height: 844, name: "portrait" },
      { width: 844, height: 390, name: "landscape" },
    ]) {
      await page.setViewportSize(viewport);
      await mountFlightHarness(page, flight);
      const holdButton = page
        .locator('.console-control--button[data-canonical-face="true"]:visible')
        .first();
      await holdButton.waitFor({ state: "visible" });
      assert.equal(
        await holdButton.evaluate((element) => getComputedStyle(element).touchAction),
        "none",
      );
      const rect = await holdButton.boundingBox();
      assert(rect, `missing ${viewport.name} hold-button bounds`);
      const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await page.waitForTimeout(450);
      assert.equal(
        await holdButton.getAttribute("data-active"),
        "true",
        `${viewport.name} touch hold must stay active`,
      );
      assert.equal(await page.evaluate(() => window.getSelection()?.toString() ?? ""), "");
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(30);
      assert.equal(
        await holdButton.getAttribute("data-active"),
        null,
        `${viewport.name} touch release must clear hold`,
      );
      results.push({ name: `browser-touch-hold-${viewport.name}`, issues: [] });
    }
  } finally {
    await page.close();
  }
}

async function mountFlightHarness(page, flight) {
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
}
