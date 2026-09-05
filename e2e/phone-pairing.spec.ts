import { expect, test } from "@playwright/test";
import { closeContext, signUp } from "./support/multiplayer";
import { installCameraFixture, qrPhoto, requestPairCode } from "./support/pairingCamera";

test("phone typing accepts ASCII dashes, smart dashes, whitespace and lowercase without approving automatically", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    screenContext = await browser.newContext();
  const owner = await ownerContext.newPage(),
    screen = await screenContext.newPage(),
    id = Date.now();
  try {
    await signUp(owner, `Manual ${id}`, `manual-${id}@example.test`);
    const code = await requestPairCode(screen),
      origin = new URL(owner.url()).origin;
    const variants = [
      code,
      `${code.slice(0, 4)}-${code.slice(4)}`,
      `${code.slice(0, 4)}–${code.slice(4)}`,
      ` ${code.slice(0, 4).toLowerCase()} - ${code.slice(4).toLowerCase()} `,
      `${origin}/device?pair=${code}`,
    ];
    await owner.goto("/device");
    for (const value of variants) {
      const change = owner.getByRole("button", { name: "Change code", exact: true });
      if (await change.isVisible()) await change.click();
      await owner.locator('[name="pairCode"]').fill(value);
      await owner.getByRole("button", { name: "Review device" }).click();
      await expect(owner.locator(".device-consent")).toBeVisible();
      await expect(owner.getByRole("button", { name: "Approve sign-in" })).toBeDisabled();
      await expect(screen.locator(".app-shell--lobby")).toHaveCount(0);
    }
    await owner.getByRole("checkbox", { name: "The code matches my other screen." }).check();
    await owner.getByRole("button", { name: "Approve sign-in" }).click();
    await expect(screen.locator(".app-shell--lobby")).toBeVisible({ timeout: 20_000 });
  } finally {
    await closeContext(ownerContext);
    await closeContext(screenContext);
  }
});

test("phone camera decodes a real QR locally, stops its tracks and still requires confirmation", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    screenContext = await browser.newContext();
  const owner = await ownerContext.newPage(),
    screen = await screenContext.newPage(),
    id = Date.now();
  try {
    await signUp(owner, `Camera ${id}`, `camera-${id}@example.test`);
    const code = await requestPairCode(screen),
      origin = new URL(owner.url()).origin;
    await installCameraFixture(owner, `${origin}/device?pair=${code}`);
    await owner.goto("/device");
    await owner.getByRole("button", { name: "Scan QR with this phone" }).click();
    expect(await owner.evaluate(() => (window as any).__cameraFixture.requests)).toBe(0);
    await owner.getByRole("button", { name: "Open camera", exact: true }).click();
    await expect(owner.locator(".device-consent")).toBeVisible({ timeout: 20_000 });
    await expect(owner.getByRole("button", { name: "Approve sign-in" })).toBeDisabled();
    expect(await owner.evaluate(() => (window as any).__cameraFixture)).toMatchObject({
      requests: 1,
      stopped: 1,
      audio: false,
    });
    await expect(screen.locator(".app-shell--lobby")).toHaveCount(0);
    await owner.getByRole("checkbox", { name: "The code matches my other screen." }).check();
    await owner.getByRole("button", { name: "Approve sign-in" }).click();
    await expect(screen.locator(".app-shell--lobby")).toBeVisible({ timeout: 20_000 });
  } finally {
    await closeContext(ownerContext);
    await closeContext(screenContext);
  }
});

test("a denied camera has a working local QR-photo fallback and rejects foreign QR links", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    screenContext = await browser.newContext();
  const owner = await ownerContext.newPage(),
    screen = await screenContext.newPage(),
    id = Date.now();
  try {
    await signUp(owner, `Photo ${id}`, `photo-${id}@example.test`);
    const code = await requestPairCode(screen),
      origin = new URL(owner.url()).origin;
    await owner.addInitScript(() =>
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("Fixture user denial", "NotAllowedError");
        },
      }),
    );
    await owner.goto("/device");
    await owner.getByRole("button", { name: "Scan QR with this phone" }).click();
    await owner.getByRole("button", { name: "Open camera", exact: true }).click();
    await expect(owner.getByRole("alert")).toContainText("permission was not granted");
    await owner.locator('input[type="file"]').setInputFiles({
      name: "foreign-qr.png",
      mimeType: "image/png",
      buffer: await qrPhoto(`https://example.test/device?pair=${code}`),
    });
    await expect(owner.getByRole("alert")).toContainText("not from this Play Together site");
    expect(new URL(owner.url()).origin).toBe(origin);
    await owner.getByRole("button", { name: "Scan QR with this phone" }).click();
    await owner.locator('input[type="file"]').setInputFiles({
      name: "screen-qr.png",
      mimeType: "image/png",
      buffer: await qrPhoto(`${origin}/device?pair=${code}`),
    });
    await expect(owner.locator(".device-consent")).toBeVisible();
    await expect(owner.getByRole("button", { name: "Approve sign-in" })).toBeDisabled();
    await owner.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(owner.getByRole("heading", { name: "Request declined" })).toBeVisible();
    await expect(screen.getByRole("status")).toContainText("declined", { timeout: 15_000 });
  } finally {
    await closeContext(ownerContext);
    await closeContext(screenContext);
  }
});
