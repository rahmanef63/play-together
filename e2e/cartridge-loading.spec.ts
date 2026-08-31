import { expect, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  expectGameFrame,
  joinFromPublicCard,
  signUp,
  startGame,
  tapRace,
  useStick,
} from "./support/multiplayer";

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
    await startGame(host);
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
        await startGame(page);
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
