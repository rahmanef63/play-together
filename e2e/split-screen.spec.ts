import { expect, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  expectGameFrame,
  joinFromPublicCard,
  signUp,
  startGame,
} from "./support/multiplayer";

test("remote controllers automatically move per-player games between shared and split screen", async ({
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
      gameKey: "turbo-circuit@0.4.1",
      maxPlayers: 3,
      visibility: "public",
    });

    await signUp(guestA, `Split A ${runId}`, `split-a-${runId}@example.test`);
    await joinFromPublicCard(guestA, roomName, code);
    await signUp(guestB, `Split B ${runId}`, `split-b-${runId}@example.test`);
    await joinFromPublicCard(guestB, roomName, code);

    await host.getByRole("button", { name: /^Remote/ }).click();
    await startGame(host);
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
