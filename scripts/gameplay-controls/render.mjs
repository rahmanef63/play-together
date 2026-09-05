import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Exercise cartridge rendering with real authoritative snapshots, without an auth backend. */
export async function verifyGameDisplays(page, root, artifactDirectory, results) {
  for (const gameId of ["turbo-circuit", "flight-trainer", "sky-strike"]) {
    const config = JSON.parse(
      await readFile(resolve(root, "games", gameId, "game.config.json"), "utf8"),
    );
    const release = resolve(root, "releases/game-cdn/games", gameId, config.game.version);
    const { createServerGame } = await import(pathToFileURL(resolve(release, "server.js")).href);
    const game = await createServerGame({
      roomId: "isolated-render-qa",
      gameId,
      gameVersion: config.game.version,
      seed: 42,
    });
    for (let index = 0; index < 4; index++) {
      const id = `qa-${index}`;
      await game.onJoin({ id, connectedAt: 0 });
    }
    for (let index = 0; index < 4; index++) {
      const id = `qa-${index}`;
      if (gameId === "turbo-circuit") await game.onInput(id, { action: "ready" }, 1);
      await game.onInput(
        id,
        gameId === "flight-trainer"
          ? { throttle: 0.8, pitch: 0.5, roll: 0.05, flaps: true, gear: true }
          : { throttle: 0.7, gun: true },
        2,
      );
    }
    for (let tick = 0; tick < 160; tick++) await game.tick(tick * 50, 50);
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(
        async ({ config, root, state }) => {
          window.qa.dispose();
          const shell = window.qa.mountConsoleShell(document.getElementById("game-root"), {
            mode: "handheld",
            preset: config.controller.console.layout,
            title: config.game.title,
          });
          const listeners = new Set();
          let latest = { type: "snapshot", tick: 160, serverTime: 8000, state };
          const context = {
            playerId: "qa-0",
            mode: "handheld",
            sendInput: (input) => window.qa.inputs.push(input),
            subscribe(listener) {
              listeners.add(listener);
              listener(latest);
              return () => listeners.delete(listener);
            },
            getLatestSnapshot: () => latest,
            loadAsset: async (name) => {
              throw new Error(`Unexpected external QA asset: ${name}`);
            },
            setStatus: () => {},
          };
          const { mountDisplay } = await import(
            `/@fs/${root}/games/${config.game.id}/src/display.ts`
          );
          const disposeDisplay = mountDisplay(shell.screen, context);
          const disposeControls = window.qa.mountBuiltinController(
            shell.controls,
            config.controller.console,
            context,
          );
          window.qa.inputs = [];
          window.qa.snapshot = (message) => {
            latest = message;
            for (const listener of listeners) listener(message);
          };
          window.qa.dispose = () => {
            disposeControls();
            disposeDisplay?.();
            shell.dispose();
          };
        },
        { config, root, state: game.snapshot() },
      );
      for (let tick = 160; tick < 180; tick++) {
        await game.tick(tick * 50, 50);
        await page.evaluate((snapshot) => window.qa.snapshot(snapshot), {
          type: "snapshot",
          tick,
          serverTime: tick * 50,
          state: game.snapshot(),
        });
        await page.waitForTimeout(25);
      }
      const canvases = await page
        .locator(".console-shell__screen canvas")
        .evaluateAll((items) =>
          items.map((canvas) => ({ width: canvas.width, height: canvas.height })),
        );
      assert(
        canvases.some((canvas) => canvas.width > 8 && canvas.height > 8),
        `No rendered game canvas: ${gameId}`,
      );
      const name = `${gameId}-gameplay-${viewport.width}x${viewport.height}`;
      await page.screenshot({ path: resolve(artifactDirectory, `${name}.png`) });
      results.push({ name, canvases, issues: [] });
      console.log(`PASS ${name}: four authoritative players, mounted 3D display and controls`);
    }
    await page.evaluate(() => window.qa.dispose());
    await game.dispose?.();
  }
}
