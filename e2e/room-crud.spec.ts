import { expect, test } from "@playwright/test";
import { closeContext, createRoom, signUp, turboCircuit } from "./support/multiplayer";

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
      gameKey: turboCircuit,
      maxPlayers: 2,
      visibility: "public",
    });

    await page.getByRole("button", { name: "← Lobby" }).click();
    await expect(page).toHaveURL("/");
    await page
      .locator(".console-panel-tabs")
      .getByRole("button", { name: "Rooms", exact: true })
      .click();
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
    await page
      .locator(".console-panel-tabs")
      .getByRole("button", { name: "Rooms", exact: true })
      .click();
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
