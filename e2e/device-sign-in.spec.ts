import { expect, test } from "@playwright/test";
import { closeContext, signUp } from "./support/multiplayer";

test("an authenticated phone explicitly approves a QR request from an independent screen", async ({
  browser,
}) => {
  const receiverContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const receiver = await receiverContext.newPage(),
    owner = await ownerContext.newPage();
  const id = Date.now(),
    ownerName = `QR Owner ${id}`;
  try {
    await signUp(owner, ownerName, `qr-owner-${id}@example.test`);
    await receiver.goto("/");
    await receiver.getByRole("button", { name: "QR sign-in", exact: true }).click();
    await receiver.getByRole("button", { name: "Show sign-in QR" }).click();
    const code = receiver.locator("[data-pairing-code]");
    await expect(code).toBeVisible();
    const publicCode = await code.getAttribute("data-pairing-code");
    expect(publicCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    await expect(receiver.getByAltText("Scan to approve sign-in on this device")).toBeVisible();
    await expect(receiver.locator(".app-shell--lobby")).toHaveCount(0);
    await owner.goto(`/device?pair=${publicCode}`);
    await expect(owner.getByRole("heading", { name: "Connect another screen" })).toBeVisible();
    // Visiting or reviewing a QR URL is never consent.
    await expect(owner.getByRole("button", { name: "Approve sign-in" })).toHaveCount(0);
    await owner.getByRole("button", { name: "Review device" }).click();
    const approve = owner.getByRole("button", { name: "Approve sign-in" });
    await expect(approve).toBeDisabled();
    await expect(receiver.locator(".app-shell--lobby")).toHaveCount(0);
    await owner.getByRole("checkbox", { name: "The code matches my other screen." }).check();
    await approve.click();
    await expect(owner.getByRole("heading", { name: "Device approved" })).toBeVisible();
    await expect(receiver.locator(".app-shell--lobby")).toBeVisible({ timeout: 20_000 });
    await expect(receiver.locator(".page-heading .eyebrow")).toContainText(ownerName.toUpperCase());
    await expect(receiver.locator(".toast-stack")).toContainText("Device connected");
    // A consumed code does not create a second authorization.
    await owner.goto(`/device?pair=${publicCode}`);
    await owner.getByRole("button", { name: "Review device" }).click();
    await expect(owner.getByRole("alert")).toContainText("invalid or expired");
  } finally {
    await closeContext(receiverContext);
    await closeContext(ownerContext);
  }
});

test("declining QR sign-in leaves the requesting screen signed out", async ({ browser }) => {
  const requesterContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext();
  const requester = await requesterContext.newPage(),
    owner = await ownerContext.newPage();
  const id = Date.now();
  try {
    await signUp(owner, `QR Decline ${id}`, `qr-decline-${id}@example.test`);
    await requester.goto("/embed");
    await requester.getByRole("button", { name: "QR sign-in", exact: true }).click();
    await requester.getByRole("button", { name: "Show sign-in QR" }).click();
    const code = requester.locator("[data-pairing-code]");
    await expect(code).toBeVisible();
    await owner.goto(`/device?pair=${await code.getAttribute("data-pairing-code")}`);
    await owner.getByRole("button", { name: "Review device" }).click();
    await owner.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(owner.getByRole("heading", { name: "Request declined" })).toBeVisible();
    await expect(requester.getByRole("status")).toContainText("declined", { timeout: 15_000 });
    await expect(requester.locator(".app-shell--lobby")).toHaveCount(0);
    await expect(requester.getByRole("button", { name: "Create a new code" })).toBeEnabled();
  } finally {
    await closeContext(requesterContext);
    await closeContext(ownerContext);
  }
});
