import assert from "node:assert/strict";
import { resolve } from "node:path";
import { displayViewports, measureDisplay } from "./displayGeometry.mjs";
import { mountGameDisplay } from "./mount.mjs";

/** Real declarative controls feed the authoritative server; no hand-crafted action shortcuts. */
export async function verifyTurboConsole(page, config, root, artifacts, createServerGame, results) {
  for (const viewport of displayViewports) {
    const game = await createServerGame({
      roomId: "console-qa",
      gameId: config.game.id,
      gameVersion: config.game.version,
      seed: 42,
    });
    await game.onJoin({ id: "qa-0", connectedAt: 0 });
    await page.setViewportSize(viewport);
    await mountGameDisplay(page, config, root, game.snapshot());
    let tick = 0,
      sequence = 0;
    const advance = async (count = 1) => {
      const inputs = await page.evaluate(() => window.qa.inputs.splice(0));
      for (const input of inputs) await game.onInput("qa-0", input, ++sequence);
      for (let i = 0; i < count; i++) await game.tick(++tick * 50, 50);
      await page.evaluate(
        (state) => window.qa.snapshot({ type: "snapshot", tick: 1, serverTime: 0, state }),
        game.snapshot(),
      );
      await page.waitForTimeout(130);
    };
    const me = () => game.snapshot().racers.find((racer) => racer.id === "qa-0");
    await advance();
    const setupName = "turbo-setup-" + viewport.width + "x" + viewport.height;
    results.push({ name: setupName, ...(await page.evaluate(measureDisplay)) });
    await page.screenshot({ path: resolve(artifacts, setupName + ".png") });
    const originalCar = me().carId;
    await page.keyboard.press("ArrowRight");
    await advance();
    assert.notEqual(me().carId, originalCar, "console stick must change the garage selection");
    const originalTrack = game.snapshot().trackId;
    await page.keyboard.press("ArrowDown");
    await advance();
    assert.notEqual(
      game.snapshot().trackId,
      originalTrack,
      "garage track selection must reach server",
    );
    await page.locator('[data-control-id="start"]').click();
    await advance(74);
    assert.equal(game.snapshot().phase, "racing");
    await page.locator('[data-control-id="gas"]').click();
    await advance(20);
    assert.equal(me().cruiseActive, true);
    assert(me().speed > 4, "A tap must move the kart after release");
    await page.locator('[data-control-id="rear-view"]').hover();
    await page.mouse.down();
    await advance();
    assert.equal(me().rearView, true);
    await page.mouse.up();
    await page.locator('[data-control-id="brake"]').hover();
    await page.mouse.down();
    await advance(45);
    assert.equal(me().cruiseActive, false);
    assert.equal(me().rearView, false);
    assert.equal(me().speed, 0);
    assert(me().rescueCooldown > 0, "holding the primary brake stopped must rescue");
    await page.mouse.up();
    await advance();
    await page.locator('[data-control-id="start"]').click();
    await advance();
    assert.equal(game.snapshot().paused, true);
    const raceMs = game.snapshot().raceMs;
    await advance(5);
    assert.equal(game.snapshot().raceMs, raceMs);
    await page.locator('[data-control-id="start"]').click();
    await advance();
    assert.equal(game.snapshot().paused, false);
    const name = "turbo-console-" + viewport.width + "x" + viewport.height;
    const geometry = await page.evaluate(measureDisplay);
    assert(
      geometry.renderPixels <= 905000,
      "render resolution must respect the per-screen pixel budget",
    );
    results.push({ name, ...geometry });
    await page.screenshot({ path: resolve(artifacts, name + ".png") });
    console.log(
      "PASS " + name + ": selection, ready, cruise, brake, recovery, rear view and pause",
    );
    await page.evaluate(() => window.qa.dispose());
    await game.dispose?.();
  }
}
