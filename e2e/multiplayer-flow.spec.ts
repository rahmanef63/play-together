import { type BrowserContext, expect, type FrameLocator, type Page, test } from "@playwright/test";

const accountPassword = "SecurePass123!";
const pong = "pong@0.4.0";
const tapRace = "tap-race@0.4.0";
const realtimeHealthUrl = process.env.E2E_REALTIME_HEALTH_URL ?? "http://127.0.0.1:8787/healthz";

async function signUp(page: Page, name: string, email: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your phone is the console." })).toBeVisible();
  const form = page.locator(".auth-card form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(accountPassword);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator(".app-shell--lobby")).toBeVisible();
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
    await expect(host.locator(".console-registry-card")).toContainText("Console");
    await expect(host.locator(".console-control-chips")).toContainText(
      /Analog stick|D-pad|A|Touchpad/,
    );
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

    await host.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(host);
    const displayFrame = host.frameLocator("iframe.game-frame");
    await expect(displayFrame.locator("canvas")).toBeVisible();
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "0");
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

    await guest.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(guest);
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "1", {
      timeout: 20_000,
    });
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-layout", "shared");
    const remoteFrame = guest.frameLocator("iframe.game-frame");
    await expect(
      remoteFrame.locator(".console-shell--remote.console-shell--classic"),
    ).toBeVisible();
    await expect(remoteFrame.locator(".console-shell__screen")).toHaveCount(0);
    await expect(remoteFrame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();
    await useStick(guest, remoteFrame, "move", 0, -0.85, 250);

    await expect
      .poll(async () => {
        const response = await request.get(realtimeHealthUrl);
        return (await response.json()).rooms as number;
      })
      .toBeGreaterThanOrEqual(1);

    await host.screenshot({ path: testInfo.outputPath("public-room-desktop.png"), fullPage: true });
    await host.getByRole("button", { name: /Room/ }).click();
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
    await expect(handheldFrame.locator(".console-shell--handheld")).toBeVisible();
    const controller = handheldFrame.locator('.builtin-controller[data-renderer="builtin"]');
    await expect(controller).toBeVisible();
    await expect(handheldFrame.locator("canvas")).toBeVisible();
    await expect(handheldFrame.locator('[data-control-id="move"]')).toBeVisible();
    await guest.screenshot({ path: testInfo.outputPath("handheld-portrait.png"), fullPage: true });

    await guest.setViewportSize({ width: 844, height: 390 });
    await expect(controller).toBeVisible();
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

    await host.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(host);
    await expect(
      host.frameLocator("iframe.game-frame").getByText("TAP RACE", { exact: true }),
    ).toBeVisible();

    await guest.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(guest);
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "1", {
      timeout: 20_000,
    });
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-layout", "shared");
    const game = guest.frameLocator("iframe.game-frame");
    await expect(game.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();
    const tap = game.getByRole("button", { name: "Tap to race" });
    await expect(tap).toBeVisible();
    await expect(game.locator('[data-control-id="move"]')).toHaveCount(0);
    for (let index = 0; index < 4; index += 1) await tap.click();
    await guest.screenshot({ path: testInfo.outputPath("tap-race-remote.png"), fullPage: true });
    await host.screenshot({ path: testInfo.outputPath("tap-race-display.png"), fullPage: true });
    await host.getByRole("button", { name: /Room/ }).click();
    await host.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(guestContext);
    await closeContext(hostContext);
  }
});

test("all ten additional games are playable handheld cartridges with screen and controls", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const games = [
    {
      key: "reaction-rush@0.3.0",
      title: "Reaction Rush",
      control: "Reaction button",
      maxPlayers: 8,
    },
    {
      key: "memory-lights@0.3.0",
      title: "Memory Lights",
      control: "Red memory pad",
      maxPlayers: 8,
    },
    { key: "snake-arena@0.3.1", title: "Snake Arena", control: "Move snake up", maxPlayers: 4 },
    { key: "dodge-dash@0.3.1", title: "Dodge Dash", control: "Dodge left", maxPlayers: 4 },
    {
      key: "target-blast@0.3.0",
      title: "Target Blast",
      control: "Target aiming pad",
      maxPlayers: 8,
    },
    { key: "tug-war@0.3.0", title: "Tug War", control: "Pull rope", maxPlayers: 2 },
    { key: "rhythm-pulse@0.3.0", title: "Rhythm Pulse", control: "Tap on beat", maxPlayers: 8 },
    { key: "maze-run@0.3.1", title: "Maze Run", control: "Move up", maxPlayers: 4 },
    { key: "stack-tower@0.3.0", title: "Stack Tower", control: "Drop block", maxPlayers: 4 },
    { key: "orbit-dodge@0.3.1", title: "Orbit Dodge", control: "Rotate clockwise", maxPlayers: 4 },
  ];

  for (const [batchIndex, batch] of [games.slice(0, 5), games.slice(5)].entries()) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
      await signUp(
        page,
        `Game Matrix ${batchIndex + 1} ${runId}`,
        `matrix-${batchIndex + 1}-${runId}@example.test`,
      );
      if (batchIndex === 0) {
        const previews = page.locator(".game-picker img");
        await expect(previews).toHaveCount(15);
        expect(
          await previews.evaluateAll((images) =>
            images.every(
              (image) =>
                image.getAttribute("loading") === "lazy" &&
                image.getAttribute("decoding") === "async",
            ),
          ),
        ).toBe(true);
        await expect
          .poll(() =>
            previews.evaluateAll((images) => {
              const visible = images.filter((image) => {
                const rect = image.getBoundingClientRect();
                return (
                  rect.right > 0 &&
                  rect.left < innerWidth &&
                  rect.bottom > 0 &&
                  rect.top < innerHeight
                );
              });
              return (
                visible.length > 0 &&
                visible.every(
                  (image) =>
                    image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
                )
              );
            }),
          )
          .toBe(true);
      }
      for (const game of batch) {
        const code = await createRoom(page, {
          name: `${game.title} ${runId}`,
          gameKey: game.key,
          maxPlayers: game.maxPlayers,
          visibility: "private",
        });

        await page.getByRole("button", { name: /Handheld console/ }).click();
        await expectGameFrame(page);
        await expect(page.locator(".play-toolbar strong")).toContainText(game.title, {
          timeout: 20_000,
        });
        const frame = page.frameLocator("iframe.game-frame");
        await expect(frame.locator(".handheld-screen")).toBeVisible({ timeout: 20_000 });
        await expect(frame.locator(".handheld-controls")).toBeVisible({ timeout: 20_000 });
        await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible({
          timeout: 20_000,
        });
        if (game.title === "Dodge Dash") {
          await useStick(page, frame, "move", -0.8, 0, 100);
        } else if (game.title === "Orbit Dodge") {
          await useStick(page, frame, "rotate", 0.8, 0, 100);
        } else {
          const control = frame.getByRole("button", { name: game.control });
          await expect(control).toBeVisible({ timeout: 20_000 });
          await control.click();
        }
        if (game.title === "Memory Lights") {
          await expect(frame.locator('[data-face="a"]')).toHaveCount(1);
          await expect(frame.locator('[data-face="b"]')).toHaveCount(1);
          await expect(frame.locator('[data-face="x"]')).toHaveCount(1);
          await expect(frame.locator('[data-face="y"]')).toHaveCount(1);
        }
        await expect(page.locator(".connection")).toHaveText("connected");
        await expect(page.locator(".play-error")).toHaveCount(0);

        await page.getByRole("button", { name: /Room/ }).click();
        await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
        await page.getByRole("button", { name: "Close room" }).click();
        await expect(page).toHaveURL("/");
      }
    } finally {
      await closeContext(context);
    }
  }
});

test("advanced 3D cartridges expose distinct console controls and live WebGL gameplay", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    { key: "turbo-circuit@0.2.1", title: "Turbo Circuit", control: "Accelerate", delay: 900 },
    { key: "sky-strike@0.2.1", title: "Sky Strike", control: "Fire cannon", delay: 180 },
    { key: "flight-trainer@0.2.1", title: "Flight Trainer", control: "Throttle up", delay: 0 },
  ];
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await signUp(page, `3D Pilot ${runId}`, `advanced-${runId}@example.test`);
    for (const game of cases) {
      const code = await createRoom(page, {
        name: `${game.title} ${runId}`,
        gameKey: game.key,
        maxPlayers: 1,
        visibility: "private",
      });
      await page.getByRole("button", { name: /Handheld console/ }).click();
      await expectGameFrame(page);
      await expect(page.locator(".play-toolbar strong")).toContainText(game.title, {
        timeout: 20_000,
      });
      const frame = page.frameLocator("iframe.game-frame");
      await expect(frame.locator(".handheld-screen canvas")).toBeVisible({ timeout: 20_000 });
      await expect(frame.locator(".handheld-controls")).toBeVisible({ timeout: 20_000 });
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible({
        timeout: 20_000,
      });
      const control = frame.getByRole("button", { name: game.control });
      await expect(control).toBeVisible({ timeout: 20_000 });
      await control.click({ delay: game.delay });
      await page.waitForTimeout(450);
      await expect(page.locator(".connection")).toHaveText("connected");
      await expect(page.locator(".play-error")).toHaveCount(0);
      await page.getByRole("button", { name: /Room/ }).click();
      await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    }
  } finally {
    await closeContext(context);
  }
});

test("screenless landscape remotes select classic, racing, and flight console shells", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    {
      key: pong,
      title: "Pong Together",
      preset: "classic",
      control: "move",
      maxPlayers: 2,
    },
    {
      key: "turbo-circuit@0.2.1",
      title: "Turbo Circuit",
      preset: "racing",
      control: "Accelerate",
      maxPlayers: 1,
    },
    {
      key: "sky-strike@0.2.1",
      title: "Sky Strike",
      preset: "flight",
      control: "Fire cannon",
      maxPlayers: 1,
    },
  ] as const;
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await signUp(page, `Remote Shell ${runId}`, `remote-shell-${runId}@example.test`);
    for (const game of cases) {
      const code = await createRoom(page, {
        name: `${game.title} Remote ${runId}`,
        gameKey: game.key,
        maxPlayers: game.maxPlayers,
        visibility: "private",
      });
      await page.goto(`/play/${code}/controller?mode=remote`);
      await expectGameFrame(page);

      const frame = page.frameLocator("iframe.game-frame");
      await expect(
        frame.locator(`.console-shell--remote.console-shell--${game.preset}`),
      ).toBeVisible({
        timeout: 20_000,
      });
      await expect(frame.locator(".console-shell__screen")).toHaveCount(0);
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible({
        timeout: 20_000,
      });
      if (game.preset === "classic") {
        await useStick(page, frame, game.control, 0, -0.8, 120);
      } else {
        const control = frame.getByRole("button", { name: game.control });
        await expect(control).toBeVisible({ timeout: 20_000 });
        await control.click({ delay: game.preset === "racing" ? 300 : 60 });
      }
      await expect(page.locator(".connection")).toHaveText("connected");
      await expect(page.locator(".play-error")).toHaveCount(0);

      await page.getByRole("button", { name: /Room/ }).click();
      await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    }
  } finally {
    await closeContext(context);
  }
});

test("remote discovery automatically moves per-player games between shared and split screen", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guestAContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestBContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guestA = await guestAContext.newPage();
  const guestB = await guestBContext.newPage();

  try {
    await signUp(host, `Split Host ${runId}`, `split-host-${runId}@example.test`);
    const roomName = `Split Circuit ${runId}`;
    const code = await createRoom(host, {
      name: roomName,
      gameKey: "turbo-circuit@0.2.1",
      maxPlayers: 3,
      visibility: "public",
    });

    await signUp(guestA, `Split A ${runId}`, `split-a-${runId}@example.test`);
    await joinFromPublicCard(guestA, roomName, code);
    await signUp(guestB, `Split B ${runId}`, `split-b-${runId}@example.test`);
    await joinFromPublicCard(guestB, roomName, code);

    await host.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(host);
    const hostFrame = host.frameLocator("iframe.game-frame");
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "0");
    await expect(hostFrame.locator(".display-grid")).toHaveAttribute("data-layout", "shared");
    await expect(hostFrame.locator(".display-viewport")).toHaveCount(1);

    await guestA.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(guestA);
    await expect(
      guestA.frameLocator("iframe.game-frame").locator(".console-shell--remote"),
    ).toBeVisible();
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "1", {
      timeout: 20_000,
    });
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-layout", "shared");
    await expect(hostFrame.locator(".display-grid")).toHaveAttribute("data-layout", "shared");
    await expect(hostFrame.locator(".display-viewport")).toHaveCount(1);

    await guestB.getByRole("button", { name: /^Remote/ }).click();
    await expectGameFrame(guestB);
    await expect(
      guestB.frameLocator("iframe.game-frame").locator(".console-shell--remote"),
    ).toBeVisible();
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "2", {
      timeout: 20_000,
    });
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-layout", "split");
    await expect(host.locator(".remote-discovery")).toContainText("2-way split screen");
    await expect(hostFrame.locator(".display-grid")).toHaveAttribute("data-layout", "split");
    await expect(hostFrame.locator(".display-grid")).toHaveAttribute("data-count", "2");
    await expect(hostFrame.locator(".display-viewport")).toHaveCount(2);
    await expect(hostFrame.locator("canvas")).toHaveCount(2);

    await guestB.getByRole("button", { name: /Room/ }).click();
    await expect(guestB).toHaveURL(new RegExp(`/room/${code}$`));
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-remote-count", "1", {
      timeout: 20_000,
    });
    await expect(host.locator(".remote-discovery")).toHaveAttribute("data-layout", "shared");
    await expect(hostFrame.locator(".display-grid")).toHaveAttribute("data-layout", "shared");
    await expect(hostFrame.locator(".display-viewport")).toHaveCount(1);

    await host.getByRole("button", { name: /Room/ }).click();
    await host.getByRole("button", { name: "Close room" }).click();
  } finally {
    await closeContext(guestBContext);
    await closeContext(guestAContext);
    await closeContext(hostContext);
  }
});

test("hosts can list, edit, and delete their rooms from the lobby directory", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await signUp(page, `CRUD Host ${runId}`, `crud-host-${runId}@example.test`);
    await expect(page.locator(".scroll-area__track")).toHaveCount(2);
    const nativeScrollbar = await page
      .locator(".scroll-area__viewport")
      .first()
      .evaluate((element) => getComputedStyle(element).scrollbarWidth);
    expect(nativeScrollbar).toBe("none");
    const roomName = `CRUD ${runId}`;
    const code = await createRoom(page, {
      name: roomName,
      gameKey: pong,
      maxPlayers: 2,
      visibility: "public",
    });

    await page.getByRole("button", { name: "← Lobby" }).click();
    await expect(page).toHaveURL("/");
    await page.getByRole("tab", { name: "My rooms" }).click();
    const card = page.locator(".room-card--owned").filter({ hasText: code });
    await expect(card).toBeVisible();
    await expect(card).toContainText(roomName);

    await card.getByRole("button", { name: "Edit" }).click();
    const editor = card.locator(".room-editor");
    const editedName = `Edited ${runId}`;
    await editor.locator('input[name="name"]').fill(editedName);
    await editor.locator('select[name="visibility"]').selectOption("private");
    await editor.locator('input[name="maxPlayers"]').fill("2");
    await editor.locator('select[name="passwordMode"]').selectOption("set");
    await editor.locator('input[name="password"]').fill("UpdatedRoom42");
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(card).toContainText(editedName);
    await expect(card).toContainText("private");
    await expect(card).toContainText("Locked");

    await page.getByRole("tab", { name: "Public" }).click();
    await expect(page.locator(".room-card").filter({ hasText: editedName })).toHaveCount(0);
    await page.getByRole("tab", { name: "My rooms" }).click();
    const editedCard = page.locator(".room-card--owned").filter({ hasText: code });
    await editedCard.getByRole("button", { name: "Delete" }).click();
    await expect(editedCard.getByRole("button", { name: "Confirm delete" })).toBeVisible();
    await editedCard.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.locator(".room-card--owned").filter({ hasText: code })).toHaveCount(0);
  } finally {
    await closeContext(context);
  }
});

test("mobile PWA shell uses full-width snap cards, native dock, and live submission docs", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  try {
    await signUp(page, `PWA Mobile ${runId}`, `pwa-mobile-${runId}@example.test`);
    const dock = page.locator(".app-dock");
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("button")).toHaveCount(5);
    await expect(dock.getByRole("button", { name: /Home/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const layout = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".lobby-grid");
      const create = document.querySelector<HTMLElement>(".create-panel");
      const rooms = document.querySelector<HTMLElement>(".rooms-panel");
      const games = document.querySelector<HTMLElement>(".game-picker");
      const dockElement = document.querySelector<HTMLElement>(".app-dock");
      const dockSurface = document.querySelector<HTMLElement>(".app-dock__surface");
      if (!rail || !create || !rooms || !games || !dockElement || !dockSurface) {
        throw new Error("Mobile PWA elements missing");
      }
      const createRect = create.getBoundingClientRect();
      const roomsRect = rooms.getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        railWidth: rail.clientWidth,
        railHeight: rail.clientHeight,
        railScrollWidth: rail.scrollWidth,
        createWidth: createRect.width,
        roomsWidth: roomsRect.width,
        gameRailWidth: games.clientWidth,
        gameRailScrollWidth: games.scrollWidth,
        gameScrollbar: getComputedStyle(games).scrollbarWidth,
        dockPosition: getComputedStyle(dockElement).position,
        dockBackground: getComputedStyle(dockSurface).backgroundColor,
        dockRadius: Number.parseFloat(getComputedStyle(dockSurface).borderRadius),
      };
    });
    expect(layout.createWidth).toBeGreaterThanOrEqual(layout.width - 32);
    expect(layout.roomsWidth).toBeGreaterThanOrEqual(layout.width - 32);
    expect(layout.railHeight).toBeGreaterThan(420);
    expect(layout.railScrollWidth).toBeGreaterThan(layout.railWidth * 1.7);
    expect(layout.gameRailScrollWidth).toBeGreaterThan(layout.gameRailWidth);
    expect(layout.gameScrollbar).toBe("none");
    expect(layout.dockPosition).toBe("fixed");
    expect(layout.dockBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(layout.dockRadius).toBeGreaterThanOrEqual(20);

    await dock.getByRole("button", { name: /Rooms/ }).click();
    await expect(page).toHaveURL("/rooms");
    await expect(page.locator(".app-shell--rooms .rooms-panel")).toBeVisible();

    await page
      .locator(".app-dock")
      .getByRole("button", { name: /Submit/ })
      .click();
    await expect(page).toHaveURL("/developers");
    await expect(page.locator(".developer-page")).toBeVisible();
    const copyButton = page.getByRole("button", { name: "Copy full submission prompt" });
    await expect(copyButton).toBeEnabled({ timeout: 10_000 });
    await copyButton.click();
    await expect(page.getByRole("button", { name: "Prompt copied" })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("You are adding one new multiplayer game");
    expect(clipboard).toContain("game_publish");
    expect(clipboard).toContain("deploy-managed");
  } finally {
    await closeContext(context);
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

async function useStick(
  page: Page,
  frame: FrameLocator,
  controlId: string,
  x: number,
  y: number,
  holdMs = 80,
) {
  const stick = frame.locator(`[data-control-id="${controlId}"]`);
  await expect(stick).toBeVisible({ timeout: 20_000 });
  const box = await stick.boundingBox();
  if (!box) throw new Error(`Stick ${controlId} has no bounding box`);
  const targetX = box.x + box.width * (0.5 + x * 0.36);
  const targetY = box.y + box.height * (0.5 - y * 0.36);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 4 });
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}
