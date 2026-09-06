import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import {
  verifyControllerLifecycle,
  verifyMobileTouchHold,
} from "./gameplay-controls/lifecycle.mjs";
import { measureControls } from "./gameplay-controls/measure.mjs";
import { verifyGameDisplays } from "./gameplay-controls/render.mjs";

const root = process.cwd();
const webRequire = createRequire(resolve(root, "apps/web/package.json"));
const { createServer } = await import(webRequire.resolve("vite"));
const artifactDirectory = resolve(root, ".local/gameplay-controls-qa");
await mkdir(artifactDirectory, { recursive: true });
const server = await createServer({
  configFile: false,
  root: resolve(root, "apps/web"),
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
  plugins: [
    {
      name: "isolated-controller-harness",
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== "/__controller_qa__") return next();
          response.setHeader("Content-Type", "text/html");
          response.end(
            '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="game-root"></div></body></html>',
          );
        });
      },
    },
  ],
});
let browser;
const results = [];
const errors = [];
try {
  await server.listen();
  const address = server.httpServer.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
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
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 844, height: 390 },
      { width: 1280, height: 720 },
    ]) {
      for (const mode of ["remote", "handheld"]) {
        await page.setViewportSize(viewport);
        await page.evaluate(
          ({ config, mode }) => {
            window.qa.dispose();
            const root = document.getElementById("game-root");
            const shell = window.qa.mountConsoleShell(root, {
              mode,
              preset: config.controller.console.layout,
              title: config.game.title,
            });
            if (shell.telemetry) shell.telemetry.textContent = `${config.game.title} · game status`;
            const dispose = window.qa.mountBuiltinController(
              shell.controls,
              config.controller.console,
              {
                playerId: "qa",
                mode,
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
          },
          { config, mode },
        );
        await page.waitForTimeout(80);
        const dimensions = await page.evaluate(measureControls);
        const name = `${gameId}-${mode}-${viewport.width}x${viewport.height}`;
        await page.screenshot({ path: resolve(artifactDirectory, `${name}.png`) });
        results.push({ name, ...dimensions });
        console.log(
          `${dimensions.issues.length ? "FAIL" : "PASS"} ${name}${dimensions.issues.length ? ` ${dimensions.issues.join(", ")}` : ""}`,
        );
      }
    }
  }
  const flight = JSON.parse(
    await readFile(resolve(root, "games/flight-trainer/game.config.json"), "utf8"),
  );
  await verifyControllerLifecycle(page, flight, results);
  await verifyMobileTouchHold(browser, origin, flight, results);
  await page.evaluate(() => window.qa.dispose());
  await verifyGameDisplays(page, root, artifactDirectory, results);
  assert.deepEqual(errors, [], "browser runtime errors");
  const failures = results.filter((result) => result.issues.length);
  await writeFile(
    resolve(artifactDirectory, "results.json"),
    `${JSON.stringify({ results, errors }, null, 2)}\n`,
  );
  assert.equal(
    failures.length,
    0,
    `${failures.length} responsive layouts failed; see .local/gameplay-controls-qa/results.json`,
  );
  console.log(`Verified ${results.length} browser cases, no runtime errors.`);
} finally {
  await browser?.close();
  await server.close();
}
