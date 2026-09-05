import { expect, test } from "@playwright/test";
import {
  closeContext,
  createRoom,
  flightTrainer,
  signUp,
  skyStrike,
  startGame,
  turboCircuit,
} from "./support/multiplayer";

test("active catalog exposes only the car game and two aircraft games", async ({ browser }) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const games = [
    {
      key: turboCircuit,
      title: "Turbo Circuit",
      control: "Start ready or pause",
      preset: "racing",
    },
    { key: skyStrike, title: "Sky Strike", control: "Fire cannon", preset: "flight" },
    {
      key: flightTrainer,
      title: "Flight Trainer",
      control: "Toggle flaps",
      preset: "flight",
    },
  ] as const;
  try {
    await signUp(page, `Catalog QA ${runId}`, `catalog-${runId}@example.test`);
    const picker = page.locator('.create-panel select[name="game"] option');
    await expect(picker).toHaveCount(3);
    expect(await picker.allTextContents()).toEqual([
      "Flight Trainer · 0.2.6",
      "Sky Strike · 0.2.6",
      "Turbo Circuit · 0.9.2",
    ]);
    const previews = page.locator(".game-picker img");
    await expect(previews).toHaveCount(3);
    expect(
      await previews.evaluateAll((images) =>
        images.every(
          (image) =>
            image.getAttribute("loading") === "lazy" && image.getAttribute("decoding") === "async",
        ),
      ),
    ).toBe(true);

    for (const game of games) {
      const code = await createRoom(page, {
        name: `${game.title} ${runId}`,
        gameKey: game.key,
        maxPlayers: 1,
        visibility: "private",
      });
      await page.getByRole("button", { name: /Handheld console/ }).click();
      await startGame(page);
      const frame = page.frameLocator("iframe.game-frame");
      await expect(frame.locator(".handheld-screen canvas")).toBeVisible({ timeout: 20_000 });
      await expect(
        frame.locator(`.console-shell--handheld.console-shell--${game.preset}`),
      ).toBeVisible();
      await expect(frame.locator(".console-stick-svg, .console-face-svg").first()).toBeVisible();
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();
      await expect(frame.getByRole("button", { name: game.control })).toBeVisible();
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
