import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createWebServer } from "../apps/web/server.mjs";

const root = await mkdtemp(join(tmpdir(), "pt-nested-embed-"));
const server = createWebServer({ root });
let browser;
try {
  await mkdir(join(root, "assets"));
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><title>Embed shell</title><iframe src="/embed/game-frame.html"></iframe><script src="/assets/ready.js"></script>',
  );
  await writeFile(
    join(root, "game-frame.html"),
    "<!doctype html><title>Cartridge frame</title><main>CARTRIDGE READY</main>",
  );
  await writeFile(
    join(root, "assets/ready.js"),
    'window.parent.postMessage({type:"play-together:embed-ready",schemaVersion:1},"https://mso-ui.rahmanef.com")',
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const local = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const [top, path, permitted] of [
    ["https://chatgpt.com", "/embed", true],
    ["https://unreviewed.example", "/embed", false],
    ["https://chatgpt.com", "/", false],
  ]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("https://game.rahmanef.com/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await fetch(local + url.pathname);
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
    });
    await page.route("https://mso-ui.rahmanef.com/test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><iframe src="https://game.rahmanef.com${path}"></iframe>`,
      }),
    );
    await page.route("https://web-sandbox.oaiusercontent.com/test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><iframe src="https://mso-ui.rahmanef.com/test"></iframe>',
      }),
    );
    await page.route(top + "/test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><iframe src="https://web-sandbox.oaiusercontent.com/test"></iframe>',
      }),
    );
    await page.goto(top + "/test");
    await page.waitForTimeout(350);
    const cartridge = page
      .frames()
      .find((frame) => frame.url() === "https://game.rahmanef.com/embed/game-frame.html");
    if (permitted) {
      assert(
        cartridge,
        `Missing inner cartridge through the full reviewed chain: ${errors.join("; ")}`,
      );
      assert.equal(await cartridge.locator("main").textContent(), "CARTRIDGE READY");
      assert(
        !errors.some((error) => /frame-ancestors|refused to display/i.test(error)),
        errors.join("; "),
      );
    } else {
      assert(!cartridge, "An unreviewed top-level ancestor must not load the cartridge");
      assert(
        errors.some((error) => /frame-ancestors|refused to display/i.test(error)),
        "Expected actual browser frame refusal",
      );
    }
    console.log(
      `PASS ${top} -> sandbox -> MSO -> ${path}: ${permitted ? "shell and cartridge loaded" : "framing refused"}`,
    );
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
