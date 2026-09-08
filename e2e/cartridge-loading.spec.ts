import { expect, test } from "@playwright/test";
import {
  clashArena,
  closeContext,
  createRoom,
  flightTrainer,
  ibuIbuTelurGulung,
  ridgeRush,
  signUp,
  skyStrike,
  startGame,
  turboCircuit,
} from "./support/multiplayer";

test("active catalog exposes six games and each game has one compact platform menu", async ({
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const games = [
    {
      key: clashArena,
      title: "Clash Arena",
      control: "Select fighter before match; jab during fight; press with B to escape a throw",
      preset: "classic",
    },
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
    {
      key: ridgeRush,
      title: "Ridge Rush",
      control: "Ready or request rematch",
      preset: "racing",
    },
    {
      key: ibuIbuTelurGulung,
      title: "Ibu-Ibu Telur Gulung",
      control: "Fire telur gulung launcher",
      preset: "classic",
    },
  ] as const;
  try {
    await signUp(page, `Catalog QA ${runId}`, `catalog-${runId}@example.test`);
    const setup = page.getByRole("button", { name: "Set up room", exact: true });
    await setup.click();
    const picker = page.locator('.create-panel select[name="game"] option');
    await expect(picker).toHaveCount(games.length);
    expect(await picker.allTextContents()).toEqual(
      games.map((game) => `${game.title} · ${game.key.split("@")[1]}`).sort(),
    );
    await page.getByRole("button", { name: "Back to library", exact: true }).click();
    const previews = page.locator(".game-picker img");
    await expect(previews).toHaveCount(games.length);
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
      await expect(page.locator(".play-toolbar__actions .ghost-button")).toHaveCount(0);
      const howTo = frame.getByRole("button", { name: "How to play" });
      const systemMenu = frame.getByRole("button", { name: "Open game menu" });
      await expect(howTo).toBeVisible();
      await expect(systemMenu).toBeVisible();
      await howTo.click();
      const instructions = frame.getByRole("dialog", { name: `${game.title} how to play` });
      await expect(instructions).toBeVisible();
      await expect(instructions.getByText("CORE CONTROLS", { exact: true })).toBeVisible();
      await instructions.getByRole("button", { name: "Close how to play" }).click();
      const portrait = await frame.locator("body").evaluate(() => {
        const start = document.querySelector<HTMLElement>(
          '[data-face="start"],[data-face="pause"]',
        );
        const actions = document.querySelector<HTMLElement>(".console-system-actions");
        if (!actions) throw new Error("System actions missing");
        const a = actions.getBoundingClientRect(),
          s = start?.getBoundingClientRect();
        return {
          actions: { top: a.top, bottom: a.bottom, left: a.left, right: a.right },
          start: s ? { top: s.top, bottom: s.bottom } : null,
        };
      });
      if (portrait.start)
        expect(portrait.actions.bottom).toBeLessThanOrEqual(portrait.start.top + 3);
      await page.setViewportSize({ width: 844, height: 390 });
      const landscape = await frame.locator("body").evaluate(() => {
        const start = document.querySelector<HTMLElement>(
          '[data-face="start"],[data-face="pause"]',
        );
        const actions = document.querySelector<HTMLElement>(".console-system-actions");
        if (!actions) throw new Error("System actions missing");
        const a = actions.getBoundingClientRect(),
          s = start?.getBoundingClientRect();
        return {
          actionCenterY: a.top + a.height / 2,
          startCenterY: s ? s.top + s.height / 2 : null,
          viewportWidth: innerWidth,
          right: a.right,
        };
      });
      if (landscape.startCenterY !== null)
        expect(Math.abs(landscape.actionCenterY - landscape.startCenterY)).toBeLessThan(30);
      expect(landscape.right).toBeLessThanOrEqual(landscape.viewportWidth + 1);
      await page.setViewportSize({ width: 390, height: 844 });
      await systemMenu.click();
      const menu = page.getByRole("dialog", { name: `${game.title} menu` });
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("button", { name: "Room details" })).toBeVisible();
      await menu.getByRole("button", { name: "Close game menu" }).click();
      await page.getByRole("button", { name: /Room/ }).click();
      await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    }
  } finally {
    await closeContext(context);
  }
});
