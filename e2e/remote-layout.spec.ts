import { expect, test } from "@playwright/test";
import { closeContext, createRoom, signUp, startGame, turboCircuit } from "./support/multiplayer";

test("active screenless remotes stay bounded in landscape and portrait", async ({
  browser,
}, testInfo) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    {
      key: turboCircuit,
      title: "Turbo Circuit",
      preset: "racing",
      control: "Ready and start race",
      visibleAction: "ITEM",
    },
    {
      key: "sky-strike@0.2.6",
      title: "Sky Strike",
      preset: "flight",
      control: "Fire cannon",
      visibleAction: "CANNON",
    },
    {
      key: "flight-trainer@0.2.6",
      title: "Flight Trainer",
      preset: "flight",
      control: "Throttle up",
      visibleAction: "FLAPS",
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
        maxPlayers: 1,
        visibility: "private",
      });
      await page.goto(`/play/${code}/controller?mode=remote`);
      await startGame(page);
      const frame = page.frameLocator("iframe.game-frame");
      await expect(
        frame.locator(`.console-shell--remote.console-shell--${game.preset}`),
      ).toBeVisible({ timeout: 20_000 });
      await expect(frame.locator(".console-shell__screen")).toHaveCount(0);
      await expect(frame.locator(".console-controller-svg")).toBeVisible();
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible();
      const geometry = await frame.locator("body").evaluate(() => {
        const chassis = document.querySelector<HTMLElement>(".console-shell__chassis");
        const controls = document.querySelector<HTMLElement>(".builtin-controller");
        if (!chassis || !controls) throw new Error("Remote controller geometry missing");
        const a = chassis.getBoundingClientRect(),
          b = controls.getBoundingClientRect();
        return {
          viewportWidth: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          chassisLeft: a.left,
          chassisRight: a.right,
          chassisWidth: a.width,
          controlsLeft: b.left,
          controlsRight: b.right,
          controlsWidth: b.width,
        };
      });
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.chassisLeft).toBeGreaterThanOrEqual(-1);
      expect(geometry.chassisRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.controlsLeft).toBeGreaterThanOrEqual(-1);
      expect(geometry.controlsRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.chassisWidth).toBeLessThanOrEqual(762);
      expect(geometry.controlsWidth).toBeLessThanOrEqual(682);
      await expect(frame.getByText(game.visibleAction, { exact: true }).first()).toBeVisible();

      if (game.preset === "racing") {
        await page.screenshot({ path: testInfo.outputPath("turbo-remote-landscape.png") });
        await page.setViewportSize({ width: 390, height: 844 });
        for (const name of [
          "Ready and start race",
          "Brake",
          "Accelerate",
          "Hold drift",
          "Use item forward",
          "Cycle camera",
        ])
          await expect(frame.getByRole("button", { name })).toBeVisible();
        const portrait = await frame.locator("body").evaluate(() => {
          const rect = (id: string) => {
            const el = document.querySelector<HTMLElement>(`[data-control-id="${id}"]`);
            if (!el) throw new Error(`Missing ${id}`);
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          return {
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            start: rect("start"),
            brake: rect("brake"),
            throttle: rect("throttle"),
            item: rect("item"),
            camera: rect("camera"),
            stick: rect("steer"),
          };
        });
        expect(portrait.scrollWidth).toBeLessThanOrEqual(portrait.viewportWidth + 1);
        for (const control of [
          portrait.start,
          portrait.brake,
          portrait.throttle,
          portrait.item,
          portrait.camera,
          portrait.stick,
        ]) {
          expect(control.top).toBeGreaterThanOrEqual(-1);
          expect(control.bottom).toBeLessThanOrEqual(portrait.viewportHeight + 1);
        }
        expect(portrait.item.width).toBeGreaterThanOrEqual(70);
        await expect(page.locator(".play-toolbar__role-switch")).toBeHidden();
        await page.screenshot({ path: testInfo.outputPath("turbo-remote-portrait.png") });
        await page.setViewportSize({ width: 844, height: 390 });
      }

      const control = frame.getByRole("button", { name: game.control });
      await expect(control).toBeVisible();
      await control.click({ delay: game.preset === "racing" ? 160 : 60 });
      await expect(page.locator(".connection")).toHaveText("connected");
      await expect(page.locator(".play-error")).toHaveCount(0);
      await page.getByRole("button", { name: /Room/ }).click();
      await page.getByRole("button", { name: "Close room" }).click();
      await expect(page).toHaveURL("/");
    }
  } finally {
    await closeContext(context);
  }
});
