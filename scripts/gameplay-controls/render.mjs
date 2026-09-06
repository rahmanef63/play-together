import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Exercise cartridge rendering with real authoritative snapshots, without an auth backend. */
export async function verifyGameDisplays(page, root, artifactDirectory, results) {
  for (const gameId of [
    "turbo-circuit",
    "flight-trainer",
    "sky-strike",
    "ridge-rush",
    "clash-arena",
  ]) {
    const config = JSON.parse(
      await readFile(resolve(root, "games", gameId, "game.config.json"), "utf8"),
    );
    const releaseServer = resolve(
      root,
      "releases/game-cdn/games",
      gameId,
      config.game.version,
      "server.js",
    );
    const draftServer = resolve(root, "games", gameId, "dist/server.js");
    const serverPath = await access(releaseServer)
      .then(() => releaseServer)
      .catch(() => draftServer);
    const { createServerGame } = await import(pathToFileURL(serverPath).href);
    const game = await createServerGame({
      roomId: "isolated-render-qa",
      gameId,
      gameVersion: config.game.version,
      seed: 42,
    });
    const playerCount = gameId === "clash-arena" ? 2 : 4;
    for (let index = 0; index < playerCount; index++) {
      const id = `qa-${index}`;
      await game.onJoin({ id, connectedAt: 0 });
    }
    if (gameId === "clash-arena") {
      for (let index = 0; index < playerCount; index++) {
        const id = `qa-${index}`;
        await game.onInput(id, { a: true }, 1);
        await game.onInput(id, { a: false }, 2);
      }
      for (let tick = 0; tick < 44; tick++) await game.tick(tick * 50, 50);
      assert.equal(game.snapshot().phase, "fight", "Clash QA must leave character select");
    }
    for (let index = 0; index < playerCount; index++) {
      const id = `qa-${index}`;
      if (gameId === "turbo-circuit" || gameId === "ridge-rush") {
        await game.onInput(id, { action: "ready" }, 1);
      }
      const input =
        gameId === "flight-trainer"
          ? { throttle: 0.8, pitch: 0.5, roll: 0.05, flaps: true, gear: true }
          : gameId === "ridge-rush"
            ? { steer: 0.06, body: 0.18, pedal: true }
            : gameId === "clash-arena"
              ? { x: index === 0 ? -0.7 : 0.7, a: index === 0, b: index === 1 }
              : { throttle: 0.7, gun: true };
      await game.onInput(id, input, gameId === "clash-arena" ? 3 : 2);
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
          const runtimeAssetManifest = await fetch(
            `/@fs/${root}/games/${config.game.id}/assets/runtime/asset-manifest.json`,
          )
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null);
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
              const entry = runtimeAssetManifest?.assets?.[name];
              if (!entry) throw new Error(`Unexpected external QA asset: ${name}`);
              const response = await fetch(
                `/@fs/${root}/games/${config.game.id}/assets/runtime/${entry.file}`,
              );
              if (!response.ok) throw new Error(`QA asset failed: ${name}`);
              return response.blob();
            },
            setStatus: (status) => window.qa.statuses.push(String(status)),
          };
          const { mountDisplay } = await import(
            `/@fs/${root}/games/${config.game.id}/src/display.ts`
          );
          const disposeDisplay = mountDisplay(shell.screen, context);
          const disposeControls = window.qa.mountBuiltinController(
            shell.controls,
            config.controller.console,
            context,
            {
              gameTitle: config.game.title,
              gameDescription: config.game.description,
              onMenu: () => window.qa.menus++,
            },
          );
          window.qa.inputs = [];
          window.qa.statuses = [];
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
      if (gameId === "clash-arena") {
        try {
          await page.waitForFunction(
            () =>
              document.querySelector(".clash-arena")?.getAttribute("data-fighter-assets") === "2",
            null,
            { timeout: 5000 },
          );
        } catch {
          const debug = await page.evaluate(() => ({
            statuses: window.qa.statuses,
            nodes: [...document.querySelectorAll(".clash-arena")].map((node) => ({
              assets: node.getAttribute("data-fighter-assets"),
              format: node.getAttribute("data-fighter-asset-format"),
              html: node.outerHTML.slice(0, 180),
            })),
          }));
          throw new Error(`Clash GLB fighters did not mount: ${JSON.stringify(debug)}`);
        }
        assert.equal(
          await page.locator(".clash-arena").getAttribute("data-fighter-asset-format"),
          "glb",
        );
        assert.equal(
          await page.locator(".clash-arena").getAttribute("data-phase"),
          "fight",
          "Clash gameplay QA must render combat after character selection",
        );
      }
      const name = `${gameId}-gameplay-${viewport.width}x${viewport.height}`;
      await page.screenshot({ path: resolve(artifactDirectory, `${name}.png`) });
      results.push({ name, canvases, issues: [] });
      console.log(`PASS ${name}: authoritative players, mounted 3D display and controls`);
    }
    await page.evaluate(() => window.qa.dispose());
    await game.dispose?.();
  }
}
