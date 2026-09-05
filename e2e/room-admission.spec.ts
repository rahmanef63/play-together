import { expect, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  expectGameFrame,
  expectPregame,
  signUp,
  signUpAtCurrentLocation,
  startGame,
  turboCircuit,
  useStick,
} from "./support/multiplayer";

test("QR join, password rooms, shared display and mobile modes respect the pre-game lobby", async ({
  browser,
}, testInfo) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  try {
    await signUp(host, `Host ${runId}`, `host-${runId}@example.test`);
    // The game-first launcher summarizes real manifest controls below its selector.
    await expect(host.locator(".library-controls")).toContainText("Analog stick");
    const publicRoomName = `Public ${runId}`;
    const publicCode = await createRoom(host, {
      name: publicRoomName,
      gameKey: turboCircuit,
      maxPlayers: 2,
      visibility: "public",
    });

    await host.getByRole("button", { name: /^Remote/ }).click();
    await expectPregame(host);
    await expect(host.getByRole("heading", { name: "Turbo Circuit" })).toBeVisible();
    await expect(host.locator(".pregame-menu__settings")).toContainText(
      "Remote party · auto shared/split",
    );
    const qr = host.locator(".room-invite-qr").first();
    await expect(qr.locator("img")).toBeVisible({ timeout: 10_000 });
    const inviteUrl = await qr.getAttribute("data-invite-url");
    const hostOrigin = new URL(host.url()).origin;
    expect(inviteUrl).toBe(`${hostOrigin}/room/${publicCode}?join=remote`);

    if (!inviteUrl) throw new Error("QR invite URL missing");
    await guest.goto(inviteUrl);
    await expect(guest).toHaveURL(inviteUrl);
    await signUpAtCurrentLocation(guest, `Guest ${runId}`, `guest-${runId}@example.test`);
    await expect(guest).toHaveURL(`${hostOrigin}/play/${publicCode}/controller?mode=remote`);
    await expectPregame(guest);
    await expect(guest.locator(".pregame-waiting")).toContainText("Waiting for host");
    await expect(host.locator(".pregame-menu__settings")).toContainText("2/2");

    await host.getByRole("button", { name: "Start Game" }).click();
    await expectGameFrame(host);
    await expectGameFrame(guest);
    const displayFrame = host.frameLocator("iframe.game-frame");
    await expect(displayFrame.locator("canvas")).toBeVisible();
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "1", {
      timeout: 20_000,
    });
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-layout", "shared");
    const viewportFit = await host.evaluate(() => {
      const device = document.querySelector<HTMLElement>(".device-frame");
      const frame = document.querySelector<HTMLIFrameElement>("iframe.game-frame");
      if (!device || !frame) throw new Error("Game viewport elements missing");
      const deviceRect = device.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        innerWidth,
        innerHeight,
        device: {
          x: deviceRect.x,
          y: deviceRect.y,
          width: deviceRect.width,
          height: deviceRect.height,
        },
        frame: { x: frameRect.x, y: frameRect.y, width: frameRect.width, height: frameRect.height },
      };
    });
    expect(viewportFit.device.x).toBeCloseTo(0, 0);
    expect(viewportFit.device.y).toBeCloseTo(0, 0);
    expect(viewportFit.device.width).toBeCloseTo(viewportFit.innerWidth, 0);
    expect(viewportFit.device.height).toBeCloseTo(viewportFit.innerHeight, 0);
    expect(viewportFit.frame.width).toBeCloseTo(viewportFit.innerWidth, 0);
    expect(viewportFit.frame.height).toBeCloseTo(viewportFit.innerHeight, 0);

    const remoteFrame = guest.frameLocator("iframe.game-frame");
    await expect(remoteFrame.locator(".console-shell--remote.console-shell--racing")).toBeVisible();
    await expect(remoteFrame.locator(".console-shell__screen")).toHaveCount(0);
    await expect(remoteFrame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();
    await useStick(guest, remoteFrame, "steer", 0, -0.85, 250);
    // `rooms` in realtime health is deliberately instance-local. In managed/serverless
    // deployments a separate health request may land on another healthy replica and
    // report zero rooms, so assert the user-visible distributed session remains live.
    await expect(host.locator(".connection")).toHaveText("connected");
    await expect(guest.locator(".connection")).toHaveText("connected");

    await host.screenshot({ path: testInfo.outputPath("public-room-desktop.png"), fullPage: true });
    await host.getByRole("button", { name: /Room/ }).click();
    await host.getByRole("button", { name: "Close room" }).click();
    await expect(host).toHaveURL("/");

    const privateRoomName = `Private ${runId}`;
    const privateCode = await createRoom(host, {
      name: privateRoomName,
      gameKey: turboCircuit,
      maxPlayers: 2,
      visibility: "private",
      roomPassword: "RoomPass42",
    });

    await guest.goto(`/room/${privateCode}`);
    await expect(guest.getByRole("heading", { name: privateRoomName })).toBeVisible();
    const inviteForm = guest.locator(".invite-card form");
    await inviteForm.locator('input[type="password"]').fill("WrongPass99");
    await inviteForm.getByRole("button", { name: "Join room" }).click();
    await expect(inviteForm.getByRole("alert")).toContainText(/incorrect|WRONG_PASSWORD/i);
    await inviteForm.locator('input[type="password"]').fill("RoomPass42");
    await inviteForm.getByRole("button", { name: "Join room" }).click();
    await expect(guest.getByRole("heading", { name: "How are you playing?" })).toBeVisible();

    await guest.getByRole("button", { name: /Handheld/ }).click();
    await expectPregame(guest);
    await expect(guest.locator(".pregame-waiting")).toContainText("Waiting for host");
    await host.getByRole("button", { name: /^Remote/ }).click();
    await startGame(host);
    await expectGameFrame(guest);
    const handheldFrame = guest.frameLocator("iframe.game-frame");
    await expect(handheldFrame.locator(".console-shell--handheld")).toBeVisible();
    const controller = handheldFrame.locator('.builtin-controller[data-renderer="builtin"]');
    await expect(controller).toBeVisible();
    await expect(handheldFrame.locator("canvas")).toBeVisible();
    await expect(handheldFrame.locator('[data-control-id="steer"]')).toBeVisible();
    const portraitScreen = await handheldFrame
      .locator(".console-shell__screen")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
        };
      });
    expect(portraitScreen.width).toBeCloseTo(portraitScreen.viewportWidth, 0);
    expect(portraitScreen.height).toBeCloseTo(portraitScreen.viewportHeight, 0);
    await guest.screenshot({ path: testInfo.outputPath("handheld-portrait.png"), fullPage: true });

    await guest.setViewportSize({ width: 844, height: 390 });
    await expect(controller).toBeVisible();
    const landscapeScreen = await handheldFrame
      .locator(".console-shell__screen")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width, viewportWidth: innerWidth };
      });
    expect(landscapeScreen.left).toBeGreaterThan(0);
    expect(landscapeScreen.right).toBeLessThan(landscapeScreen.viewportWidth);
    expect(landscapeScreen.width).toBeLessThan(landscapeScreen.viewportWidth * 0.7);
    await guest.screenshot({ path: testInfo.outputPath("handheld-landscape.png"), fullPage: true });
    await host.getByRole("button", { name: /Room/ }).click();
    await host.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(guestContext);
    await closeContext(hostContext);
  }
});
