import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { createWebServer } from "../apps/web/server.mjs";

const root = await mkdtemp(join(tmpdir(), "pt-nested-embed-"));
const server = createWebServer({ root });
const sandbox = "https://web-sandbox.oaiusercontent.com";
const native = "https://mso-ui.rahmanef.com";
// Synthetic hostnames test the documented sandbox family, not a captured user session.
const scoped = "https://mso-ui-rahmanef-com.web-sandbox.oaiusercontent.com";
const cases = [
  { name: "legacy MSO origin", component: native },
  { name: "default sandbox origin", component: sandbox },
  { name: "app-scoped sandbox", component: scoped },
  { name: "independent sandbox label", component: "https://mso-qa.web-sandbox.oaiusercontent.com" },
  { name: "unreviewed top", component: scoped, top: "https://unreviewed.example", denied: true },
  {
    name: "sandbox suffix lookalike",
    component: "https://mso.web-sandbox.oaiusercontent.com.attacker.test",
    denied: true,
  },
  {
    name: "unreviewed intermediate ancestor",
    component: scoped,
    proxy: "https://unreviewed.example",
    denied: true,
  },
  { name: "regular app stays protected", component: scoped, path: "/", denied: true },
];
let browser;
try {
  const bundled = await build({
    entryPoints: ["apps/web/src/shared/embedReady.ts"],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "EmbedReadiness",
  });
  await mkdir(join(root, "assets"));
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><title>Embed shell</title><iframe src="/embed/game-frame.html"></iframe><script src="/assets/ready.js"></script>',
  );
  await writeFile(
    join(root, "game-frame.html"),
    "<!doctype html><title>Cartridge frame</title><main>CARTRIDGE READY</main>",
  );
  // Execute the actual readiness implementation; do not substitute a passing stub.
  await writeFile(
    join(root, "assets/ready.js"),
    `${bundled.outputFiles[0].text}\nEmbedReadiness.notifyEmbedReady();`,
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const local = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const scenario of cases) {
    const {
      name,
      component,
      top = "https://chatgpt.com",
      proxy = sandbox,
      path = "/embed",
      denied = false,
    } = scenario;
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
    await page.route(component + "/widget", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><script>
        window.readyCount=0;
        window.addEventListener("message",event=>{
          const frame=document.querySelector("iframe");
          if(event.source!==frame?.contentWindow||event.origin!=="https://game.rahmanef.com")return;
          if(event.data?.type==="play-together:embed-ready"&&event.data.schemaVersion===1)window.readyCount++;
        });
      </script><iframe sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" src="https://game.rahmanef.com${path}"></iframe>`,
      }),
    );
    await page.route(proxy + "/proxy", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><iframe src="${component}/widget"></iframe>`,
      }),
    );
    await page.route(top + "/test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><iframe src="${proxy}/proxy"></iframe>`,
      }),
    );
    await page.goto(top + "/test");
    const widget = page.frames().find((frame) => frame.url() === component + "/widget");
    assert(widget, `${name}: missing host widget`);
    if (!denied) {
      await expect.poll(() => widget.evaluate(() => window.readyCount), { timeout: 5000 }).toBe(1);
      const cartridge = page
        .frames()
        .find((frame) => frame.url() === "https://game.rahmanef.com/embed/game-frame.html");
      assert(cartridge, `${name}: missing inner cartridge: ${errors.join("; ")}`);
      assert.equal(await cartridge.locator("main").textContent(), "CARTRIDGE READY");
      assert(
        !errors.some((error) => /frame-ancestors|refused to display|postMessage/i.test(error)),
        errors.join("; "),
      );
    } else {
      await expect
        .poll(() => errors.some((error) => /frame-ancestors|refused to display/i.test(error)))
        .toBe(true);
      assert(
        !page
          .frames()
          .some((frame) => frame.url() === "https://game.rahmanef.com/embed/game-frame.html"),
        `${name}: unauthorized cartridge loaded`,
      );
      assert.equal(await widget.evaluate(() => window.readyCount), 0);
    }
    console.log(
      `PASS ${name}: ${denied ? "framing refused; no readiness" : "shell, cartridge and real readiness delivered"}`,
    );
    await page.close();
  }
  console.log(
    `Verified ${cases.length} nested-origin scenarios without disabling browser security.`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
