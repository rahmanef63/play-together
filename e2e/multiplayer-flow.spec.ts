import { type BrowserContext, expect, type Page, test } from "@playwright/test";

const accountPassword = "SecurePass123!";
const pong = "pong@0.2.0";
const tapRace = "tap-race@0.2.0";
const realtimeHealthUrl = process.env.E2E_REALTIME_HEALTH_URL ?? "http://127.0.0.1:8787/healthz";

async function signUp(page: Page, name: string, email: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your phone is the console." })).toBeVisible();
  const form = page.locator(".auth-card form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(accountPassword);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Find a spot to play together." })).toBeVisible();
}

async function createRoom(
  page: Page,
  options: {
    name: string;
    gameKey: string;
    maxPlayers: number;
    visibility: "public" | "private";
    roomPassword?: string;
  },
): Promise<string> {
  const form = page.locator(".create-panel form");
  const game = form.locator('select[name="game"]');
  await expect(game).toBeVisible();
  await game.selectOption(options.gameKey);
  await form.locator('input[name="name"]').fill(options.name);
  await form.locator('select[name="visibility"]').selectOption(options.visibility);
  await form.locator('input[name="maxPlayers"]').fill(String(options.maxPlayers));
  if (options.roomPassword) {
    await form.locator('input[name="password"]').fill(options.roomPassword);
  }
  await form.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+$/);
  const code = new URL(page.url()).pathname.split("/").at(-1);
  if (!code) throw new Error("Room code missing from URL");
  await expect(page.locator(".room-code strong")).toHaveText(code);
  return code;
}

async function joinFromPublicCard(page: Page, roomName: string, roomCode: string): Promise<void> {
  const publicCard = page.locator(".room-card").filter({ hasText: roomName });
  await expect(publicCard).toBeVisible();
  await publicCard.getByRole("button", { name: "Join" }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${roomCode}$`));
  await expect(page.getByRole("heading", { name: "How are you playing?" })).toBeVisible();
}

async function expectGameFrame(page: Page): Promise<void> {
  await expect(page.locator(".connection")).toHaveText("connected", { timeout: 20_000 });
  await expect(page.locator("iframe.game-frame")).toBeVisible();
}

async function closeContext(context: BrowserContext): Promise<void> {
  try {
    await context.close();
  } catch {
    // A failed assertion may already have closed a context.
  }
}

test("public and password-protected rooms work across shared display and mobile modes", async ({
  browser,
  request,
}, testInfo) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  try {
    await signUp(host, `Host ${runId}`, `host-${runId}@example.test`);
    const publicRoomName = `Public ${runId}`;
    const publicCode = await createRoom(host, {
      name: publicRoomName,
      gameKey: pong,
      maxPlayers: 2,
      visibility: "public",
    });

    await signUp(guest, `Guest ${runId}`, `guest-${runId}@example.test`);
    const publicCard = guest.locator(".room-card").filter({ hasText: publicRoomName });
    await expect(publicCard).toContainText("1/2 spots");
    await joinFromPublicCard(guest, publicRoomName, publicCode);

    const displayPromise = hostContext.waitForEvent("page");
    await host.getByRole("button", { name: /Shared display/ }).click();
    const display = await displayPromise;
    await display.waitForLoadState("domcontentloaded");
    await expectGameFrame(display);
    await expect(display.frameLocator("iframe.game-frame").locator("canvas")).toBeVisible();

    await guest.getByRole("button", { name: /Remote only/ }).click();
    await expectGameFrame(guest);
    const remoteFrame = guest.frameLocator("iframe.game-frame");
    const down = remoteFrame.getByRole("button", { name: "Move paddle down" });
    await expect(down).toBeVisible();
    await down.click({ delay: 250 });

    await expect
      .poll(async () => {
        const response = await request.get(realtimeHealthUrl);
        return (await response.json()).rooms as number;
      })
      .toBeGreaterThanOrEqual(1);

    await host.screenshot({ path: testInfo.outputPath("public-room-desktop.png"), fullPage: true });
    await display.close();
    await host.getByRole("button", { name: "Close room" }).click();
    await expect(host).toHaveURL("/");

    const privateRoomName = `Private ${runId}`;
    const privateCode = await createRoom(host, {
      name: privateRoomName,
      gameKey: pong,
      maxPlayers: 2,
      visibility: "private",
      roomPassword: "RoomPass42",
    });

    await guest.goto("/");
    await expect(
      guest.getByRole("heading", { name: "Find a spot to play together." }),
    ).toBeVisible();
    await expect(guest.locator(".room-card").filter({ hasText: privateRoomName })).toHaveCount(0);

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
    await expectGameFrame(guest);
    const handheldFrame = guest.frameLocator("iframe.game-frame");
    const controller = handheldFrame.locator(".pong-controller--handheld");
    await expect(controller).toBeVisible();
    await expect(handheldFrame.locator("canvas")).toBeVisible();
    const portraitColumnCount = await controller.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
    );
    expect(portraitColumnCount).toBe(1);
    await guest.screenshot({ path: testInfo.outputPath("handheld-portrait.png"), fullPage: true });

    await guest.setViewportSize({ width: 844, height: 390 });
    await expect
      .poll(() => controller.evaluate((element) => getComputedStyle(element).gridTemplateColumns))
      .not.toBe("none");
    await guest.screenshot({ path: testInfo.outputPath("handheld-landscape.png"), fullPage: true });
    await host.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(guestContext);
    await closeContext(hostContext);
  }
});

test("each game supplies its own independently loaded controller and shared display", async ({
  browser,
}, testInfo) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostContext = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  try {
    await signUp(host, `Tap Host ${runId}`, `tap-host-${runId}@example.test`);
    const roomName = `Tap Race ${runId}`;
    const roomCode = await createRoom(host, {
      name: roomName,
      gameKey: tapRace,
      maxPlayers: 4,
      visibility: "public",
    });
    await signUp(guest, `Tap Guest ${runId}`, `tap-guest-${runId}@example.test`);
    await joinFromPublicCard(guest, roomName, roomCode);

    const displayPromise = hostContext.waitForEvent("page");
    await host.getByRole("button", { name: /Shared display/ }).click();
    const display = await displayPromise;
    await display.waitForLoadState("domcontentloaded");
    await expectGameFrame(display);
    await expect(
      display.frameLocator("iframe.game-frame").getByText("TAP RACE", { exact: true }),
    ).toBeVisible();

    await guest.getByRole("button", { name: /Remote only/ }).click();
    await expectGameFrame(guest);
    const game = guest.frameLocator("iframe.game-frame");
    const tap = game.getByRole("button", { name: "Tap to race" });
    await expect(tap).toBeVisible();
    await expect(game.getByRole("button", { name: "Move paddle down" })).toHaveCount(0);
    for (let index = 0; index < 4; index += 1) await tap.click();
    await guest.screenshot({ path: testInfo.outputPath("tap-race-remote.png"), fullPage: true });
    await display.screenshot({ path: testInfo.outputPath("tap-race-display.png"), fullPage: true });
    await display.close();
    await host.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(guestContext);
    await closeContext(hostContext);
  }
});

test("concurrent joins cannot overbook the final public room slot", async ({ browser }) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const guestAContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestBContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guestA = await guestAContext.newPage();
  const guestB = await guestBContext.newPage();

  try {
    await signUp(host, `Capacity Host ${runId}`, `capacity-host-${runId}@example.test`);
    const roomCode = await createRoom(host, {
      name: `Capacity ${runId}`,
      gameKey: pong,
      maxPlayers: 2,
      visibility: "public",
    });
    await signUp(guestA, `Guest A ${runId}`, `capacity-a-${runId}@example.test`);
    await signUp(guestB, `Guest B ${runId}`, `capacity-b-${runId}@example.test`);
    await guestA.goto(`/room/${roomCode}`);
    await guestB.goto(`/room/${roomCode}`);
    const joinA = guestA.locator(".invite-card form").getByRole("button", { name: "Join room" });
    const joinB = guestB.locator(".invite-card form").getByRole("button", { name: "Join room" });
    await expect(joinA).toBeVisible();
    await expect(joinB).toBeVisible();
    await Promise.all([joinA.click(), joinB.click()]);

    const launchA = guestA.getByRole("heading", { name: "How are you playing?" });
    const launchB = guestB.getByRole("heading", { name: "How are you playing?" });
    await expect
      .poll(async () => Number(await launchA.isVisible()) + Number(await launchB.isVisible()))
      .toBe(1);
    const rejected = (await launchA.isVisible()) ? guestB : guestA;
    await expect(rejected.getByRole("alert")).toContainText(/room is full|ROOM_FULL/i);
    await host.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(guestBContext);
    await closeContext(guestAContext);
    await closeContext(hostContext);
  }
});
