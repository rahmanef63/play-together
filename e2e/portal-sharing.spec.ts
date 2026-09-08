import { expect, test } from "@playwright/test";
import { createRoom, signUp, turboCircuit } from "./support/multiplayer";

test("portal links select the game and recover when clipboard access is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    });
  });
  await signUp(page, "Portal QA", `portal-${Date.now()}@example.test`);
  await page.goto("/?game=turbo-circuit");
  await expect(page.locator(".game-stage h1")).toHaveText("Turbo Circuit");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Preview gameplay", exact: true }).click();
  const video = page.locator(".game-preview video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause preview", exact: true }).click();
  await expect(video).toHaveCount(0);
  await page.getByText("Share this game", { exact: true }).click();
  await page.getByRole("button", { name: "Share…", exact: true }).click();
  await expect(page.getByLabel("Invitation link", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Copy game link", exact: true }).click();
  await expect(page.getByLabel("Invitation link", { exact: true })).toHaveValue(
    /\?game=turbo-circuit/,
  );
  await expect(page.locator(".share-link [role=status]")).toContainText("manually");
  await page.getByLabel("Search games", { exact: true }).fill("no-such-cartridge");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByLabel("Search games", { exact: true })).toHaveValue("");
  const code = await createRoom(page, {
    name: "Share recovery",
    gameKey: turboCircuit,
    maxPlayers: 2,
    visibility: "private",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const remote = page.getByRole("button", { name: "Remote", exact: true });
  const handheld = page.getByRole("button", { name: /Handheld console/ });
  await expect(remote).toBeInViewport();
  await expect(handheld).toBeInViewport();
  const contrast = await remote.evaluate((element) => {
    const luminance = (value: string) => {
      const rgb =
        value
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number) ?? [];
      const linear = rgb.map((channel) => {
        const n = channel / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return (linear[0] ?? 0) * 0.2126 + (linear[1] ?? 0) * 0.7152 + (linear[2] ?? 0) * 0.0722;
    };
    const text = luminance(getComputedStyle(element.querySelector("strong") ?? element).color);
    const background = luminance(getComputedStyle(element).backgroundColor);
    return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Copy invite", exact: true }).click();
  await expect(page.getByLabel("Invitation link", { exact: true })).toHaveValue(
    new RegExp(`/room/${code}$`),
  );
  await page.getByRole("button", { name: "Close room", exact: true }).click();
});

test("game covers recover from missing media and mobile setup stays reachable", async ({
  page,
}) => {
  await page.route("**/game-previews/*.webp*", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, "Media QA", `media-${Date.now()}@example.test`);
  await expect(page.locator(".game-stage .game-cover-fallback")).toBeVisible();
  await page.getByText("Share this game", { exact: true }).click();
  await page.getByRole("button", { name: "Copy game link", exact: true }).click();
  await expect(page.locator(".share-link [role=status]")).toContainText(/copied|manually/);
  await page.getByText("Share this game", { exact: true }).click();
  await page.getByRole("button", { name: "Set up room", exact: true }).click();
  await expect(page.locator(".create-panel form input[name=name]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create room", exact: true })).toBeVisible();
});
