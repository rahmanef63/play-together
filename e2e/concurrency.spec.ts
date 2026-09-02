import { expect, test } from "@playwright/test";
import { closeContext, createRoom, signUp, turboCircuit } from "./support/multiplayer";

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
      gameKey: turboCircuit,
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
