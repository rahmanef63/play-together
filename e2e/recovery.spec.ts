import { expect, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  expectGameFrame,
  expectPregame,
  signUp,
  startGame,
  tapRace,
} from "./support/multiplayer";

test("remote and shared screen recover after network interruption and keep accepting input", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostContext = await browser.newContext({ viewport: { width: 1024, height: 720 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  let hostDropPong = false;
  let guestDropPong = false;
  let hostRealtimeSockets = 0;
  let guestRealtimeSockets = 0;
  await host.routeWebSocket(/\/v1\/connect/, (route) => {
    hostRealtimeSockets += 1;
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (!hostDropPong || !isPong(message)) route.send(message);
    });
  });
  await guest.routeWebSocket(/\/v1\/connect/, (route) => {
    guestRealtimeSockets += 1;
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (!guestDropPong || !isPong(message)) route.send(message);
    });
  });
  try {
    await signUp(host, `Recovery Host ${runId}`, `recovery-host-${runId}@example.test`);
    const code = await createRoom(host, {
      name: `Recovery ${runId}`,
      gameKey: tapRace,
      maxPlayers: 2,
      visibility: "private",
    });
    await signUp(guest, `Recovery Guest ${runId}`, `recovery-guest-${runId}@example.test`);
    await guest.goto(`/room/${code}`);
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest.getByRole("heading", { name: "How are you playing?" })).toBeVisible();

    await host.goto(`/play/${code}/display`);
    await guest.goto(`/play/${code}/controller?mode=remote`);
    await expectPregame(guest);
    await startGame(host);
    await expectGameFrame(guest);

    const display = host.frameLocator("iframe.game-frame");
    const remote = guest.frameLocator("iframe.game-frame");
    const tap = remote.getByRole("button", { name: "Tap to race" });
    await expect(remote.locator(".console-controller-svg")).toBeVisible();
    await tap.click();
    await expect(display.getByText("4%", { exact: true })).toBeVisible();

    const guestSocketsBefore = guestRealtimeSockets;
    guestDropPong = true;
    await expect
      .poll(() => guestRealtimeSockets, { timeout: 30_000 })
      .toBeGreaterThan(guestSocketsBefore);
    guestDropPong = false;
    await expect(guest.locator(".connection")).toHaveText("connected", { timeout: 25_000 });
    await tap.click();
    await expect(display.getByText("8%", { exact: true })).toBeVisible({ timeout: 15_000 });

    const hostSocketsBefore = hostRealtimeSockets;
    hostDropPong = true;
    await expect
      .poll(() => hostRealtimeSockets, { timeout: 30_000 })
      .toBeGreaterThan(hostSocketsBefore);
    hostDropPong = false;
    await expect(host.locator(".connection")).toHaveText("connected", { timeout: 25_000 });
    await tap.click();
    await expect(display.getByText("12%", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(host.locator(".play-error")).toHaveCount(0);
    await expect(guest.locator(".play-error")).toHaveCount(0);
  } finally {
    await closeContext(guestContext);
    await closeContext(hostContext);
  }
});

test("3D game frame self-recovers from a WebGL context loss without restarting the page", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await signUp(page, `Recovery Pilot ${runId}`, `recovery-pilot-${runId}@example.test`);
    await createRoom(page, {
      name: `Recovery Turbo ${runId}`,
      gameKey: "turbo-circuit@0.7.0",
      maxPlayers: 1,
      visibility: "private",
    });
    await page.getByRole("button", { name: /Handheld console/ }).click();
    await startGame(page);
    const frame = page.frameLocator("iframe.game-frame");
    await expect(frame.locator(".turbo-circuit canvas")).toBeVisible({ timeout: 20_000 });
    let loads = 0;
    page.on("framenavigated", (navigated) => {
      if (navigated.parentFrame() === page.mainFrame()) loads += 1;
    });

    await frame.locator(".turbo-circuit canvas").dispatchEvent("webglcontextlost");
    await expect.poll(() => loads, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect(frame.locator(".turbo-circuit canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".connection")).toHaveText("connected");
    await expect(page.locator(".play-error")).toHaveCount(0);
  } finally {
    await closeContext(context);
  }
});

function isPong(message: string | Buffer): boolean {
  if (typeof message !== "string") return false;
  try {
    return (JSON.parse(message) as { type?: unknown }).type === "pong";
  } catch {
    return false;
  }
}
