import { expect, test } from "@playwright/test";
import { closeContext, createRoom, pong, signUp, startGame, useStick } from "./support/multiplayer";

test("screenless remotes stay bounded in landscape and portrait across console shells", async ({
  browser,
}, testInfo) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cases = [
    {
      key: pong,
      title: "Pong Together",
      preset: "classic",
      control: "move",
      visibleAction: null,
      maxPlayers: 2,
    },
    {
      key: "turbo-circuit@0.7.0",
      title: "Turbo Circuit",
      preset: "racing",
      control: "Ready and start race",
      visibleAction: "BOOST",
      maxPlayers: 1,
    },
    {
      key: "sky-strike@0.2.6",
      title: "Sky Strike",
      preset: "flight",
      control: "Fire cannon",
      visibleAction: "CANNON",
      maxPlayers: 1,
    },
    {
      key: "flight-trainer@0.2.6",
      title: "Flight Trainer",
      preset: "flight",
      control: "Throttle up",
      visibleAction: "FLAPS",
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
      await startGame(page);

      const frame = page.frameLocator("iframe.game-frame");
      await expect(
        frame.locator(`.console-shell--remote.console-shell--${game.preset}`),
      ).toBeVisible({
        timeout: 20_000,
      });
      await expect(frame.locator(".console-shell__screen")).toHaveCount(0);
      await expect(frame.locator(".console-controller-svg")).toBeVisible();
      await expect(frame.locator('.builtin-controller[data-renderer="builtin"]')).toBeVisible({
        timeout: 20_000,
      });
      const remoteGeometry = await frame.locator("body").evaluate(() => {
        const chassis = document.querySelector<HTMLElement>(".console-shell__chassis");
        const controls = document.querySelector<HTMLElement>(".builtin-controller");
        if (!chassis || !controls) throw new Error("Remote controller geometry missing");
        const chassisRect = chassis.getBoundingClientRect();
        const controlsRect = controls.getBoundingClientRect();
        return {
          viewportWidth: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          chassisLeft: chassisRect.left,
          chassisRight: chassisRect.right,
          chassisWidth: chassisRect.width,
          controlsLeft: controlsRect.left,
          controlsRight: controlsRect.right,
          controlsWidth: controlsRect.width,
        };
      });
      expect(remoteGeometry.scrollWidth).toBeLessThanOrEqual(remoteGeometry.viewportWidth + 1);
      expect(remoteGeometry.chassisLeft).toBeGreaterThanOrEqual(-1);
      expect(remoteGeometry.chassisRight).toBeLessThanOrEqual(remoteGeometry.viewportWidth + 1);
      expect(remoteGeometry.controlsLeft).toBeGreaterThanOrEqual(-1);
      expect(remoteGeometry.controlsRight).toBeLessThanOrEqual(remoteGeometry.viewportWidth + 1);
      if (game.preset === "racing" || game.preset === "flight") {
        expect(remoteGeometry.chassisWidth).toBeLessThanOrEqual(762);
        expect(remoteGeometry.controlsWidth).toBeLessThanOrEqual(682);
        expect(remoteGeometry.chassisWidth).toBeLessThan(remoteGeometry.viewportWidth * 0.96);
      }
      if (game.visibleAction) {
        await expect(frame.getByText(game.visibleAction, { exact: true })).toBeVisible();
      }
      if (game.preset === "racing") {
        await page.screenshot({ path: testInfo.outputPath("turbo-remote-landscape.png") });
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(frame.getByRole("button", { name: "Ready and start race" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Brake" })).toBeVisible();
        await expect(frame.getByRole("button", { name: "Nitro boost" })).toBeVisible();
        await expect(
          frame.getByRole("button", { name: "Toggle chase or driver camera" }),
        ).toBeVisible();
        await expect(frame.locator('[data-control-id="throttle"]')).toHaveCount(0);
        const portraitGeometry = await frame.locator("body").evaluate(() => {
          const rectFor = (selector: string) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) throw new Error(`Missing ${selector}`);
            const rect = element.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
          };
          return {
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            start: rectFor('[data-control-id="start"]'),
            brake: rectFor('[data-control-id="brake"]'),
            boost: rectFor('[data-control-id="boost"]'),
            camera: rectFor('[data-control-id="camera"]'),
            stick: rectFor('[data-control-id="steer"]'),
          };
        });
        expect(portraitGeometry.scrollWidth).toBeLessThanOrEqual(
          portraitGeometry.viewportWidth + 1,
        );
        for (const control of [
          portraitGeometry.start,
          portraitGeometry.brake,
          portraitGeometry.boost,
          portraitGeometry.camera,
          portraitGeometry.stick,
        ]) {
          expect(control.top).toBeGreaterThanOrEqual(-1);
          expect(control.bottom).toBeLessThanOrEqual(portraitGeometry.viewportHeight + 1);
        }
        expect(portraitGeometry.start.height).toBeLessThan(portraitGeometry.viewportHeight * 0.34);
        expect(portraitGeometry.brake.height).toBeLessThan(portraitGeometry.viewportHeight * 0.34);
        expect(portraitGeometry.boost.width).toBeGreaterThanOrEqual(70);
        await expect(page.locator(".play-toolbar__role-switch")).toBeHidden();
        await page.screenshot({ path: testInfo.outputPath("turbo-remote-portrait.png") });
        await page.setViewportSize({ width: 844, height: 390 });
      }
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
