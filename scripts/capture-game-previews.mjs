import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const outputDir = path.resolve("apps/web/public/game-previews");
const password = "PreviewPass123!";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const games = [
  { key: "pong@0.3.0", id: "pong", title: "Pong Together", control: "Move paddle down", taps: 1 },
  { key: "tap-race@0.3.0", id: "tap-race", title: "Tap Race", control: "Tap to race", taps: 8 },
  {
    key: "reaction-rush@0.2.0",
    id: "reaction-rush",
    title: "Reaction Rush",
    control: "Reaction button",
    taps: 1,
  },
  {
    key: "memory-lights@0.2.0",
    id: "memory-lights",
    title: "Memory Lights",
    control: "Red memory pad",
    taps: 1,
  },
  {
    key: "snake-arena@0.2.0",
    id: "snake-arena",
    title: "Snake Arena",
    control: "Move snake up",
    taps: 1,
  },
  {
    key: "dodge-dash@0.2.0",
    id: "dodge-dash",
    title: "Dodge Dash",
    control: "Dodge left",
    taps: 2,
  },
  {
    key: "target-blast@0.2.0",
    id: "target-blast",
    title: "Target Blast",
    control: "Target aiming pad",
    taps: 2,
  },
  {
    key: "tug-war@0.2.0",
    id: "tug-war",
    title: "Tug War",
    control: "Pull rope",
    taps: 8,
    needsGuest: true,
  },
  {
    key: "rhythm-pulse@0.2.0",
    id: "rhythm-pulse",
    title: "Rhythm Pulse",
    control: "Tap on beat",
    taps: 3,
  },
  { key: "maze-run@0.2.0", id: "maze-run", title: "Maze Run", control: "Move up", taps: 2 },
  {
    key: "stack-tower@0.2.0",
    id: "stack-tower",
    title: "Stack Tower",
    control: "Drop block",
    taps: 2,
  },
  {
    key: "orbit-dodge@0.2.0",
    id: "orbit-dodge",
    title: "Orbit Dodge",
    control: "Rotate clockwise",
    taps: 2,
  },
  {
    key: "turbo-circuit@0.1.1",
    id: "turbo-circuit",
    title: "Turbo Circuit",
    control: "Accelerate",
    taps: 1,
    delay: 1400,
  },
  {
    key: "sky-strike@0.1.1",
    id: "sky-strike",
    title: "Sky Strike",
    control: "Fire cannon",
    taps: 3,
    delay: 180,
  },
  {
    key: "flight-trainer@0.1.1",
    id: "flight-trainer",
    title: "Flight Trainer",
    control: "Throttle up",
    taps: 8,
  },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  let guestContext;
  let guestPage;
  for (let batchIndex = 0; batchIndex < Math.ceil(games.length / 4); batchIndex += 1) {
    const context = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await signUp(
      page,
      `Preview Host ${batchIndex + 1} ${runId}`,
      `preview-host-${batchIndex + 1}-${runId}@example.test`,
    );

    try {
      for (const game of games.slice(batchIndex * 4, batchIndex * 4 + 4)) {
        const code = await createRoom(page, game);
        if (game.needsGuest) {
          if (!guestPage) {
            guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
            guestPage = await guestContext.newPage();
            await signUp(
              guestPage,
              `Preview Guest ${runId}`,
              `preview-guest-${runId}@example.test`,
            );
          }
          await guestPage.goto(`${baseUrl}/room/${code}`);
          const join = guestPage.getByRole("button", { name: "Join room" });
          await join.waitFor({ state: "visible", timeout: 20_000 });
          await join.click();
          await guestPage
            .getByRole("heading", { name: "How are you playing?" })
            .waitFor({ state: "visible", timeout: 20_000 });
          await guestPage.getByRole("button", { name: /Handheld console/ }).click();
          await expectConnected(guestPage);
        }

        await page.getByRole("button", { name: /Handheld console/ }).click();
        await expectConnected(page);
        const frame = page.frameLocator("iframe.game-frame");
        const screen = frame.locator(".handheld-screen");
        const control = frame.getByRole("button", { name: game.control });
        await screen.waitFor({ state: "visible", timeout: 20_000 });
        await control.waitFor({ state: "visible", timeout: 20_000 });
        for (let index = 0; index < game.taps; index += 1) {
          await control.click({ timeout: 10_000, delay: game.delay ?? 0 });
          await page.waitForTimeout(70);
        }
        await page.waitForTimeout(game.id === "reaction-rush" ? 1_500 : 850);
        await screen.screenshot({ path: path.join(outputDir, `${game.id}.png`) });
        console.log(`Captured ${game.id}`);

        await page.getByRole("button", { name: /Room/ }).click();
        await page.getByRole("button", { name: "Close room" }).click();
        await page.waitForURL(`${baseUrl}/`);
        if (game.needsGuest && guestPage) await guestPage.goto(`${baseUrl}/`);
      }
    } finally {
      await context.close();
    }
  }
  await guestContext?.close();
} finally {
  await browser.close();
}

async function signUp(page, name, email) {
  await page.goto(`${baseUrl}/`);
  const form = page.locator(".auth-card form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.getByRole("button", { name: "Create account" }).click();
  await page
    .getByRole("heading", { name: "Find a spot to play together." })
    .waitFor({ timeout: 20_000 });
}

async function createRoom(page, game) {
  const form = page.locator(".create-panel form");
  await form.locator('select[name="game"]').selectOption(game.key);
  await form.locator('input[name="name"]').fill(`${game.title} Preview ${runId}`);
  await form.locator('select[name="visibility"]').selectOption("private");
  await form.locator('input[name="maxPlayers"]').fill(game.needsGuest ? "2" : "1");
  await form.getByRole("button", { name: "Create room" }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]+$/, { timeout: 20_000 });
  return new URL(page.url()).pathname.split("/").at(-1);
}

async function expectConnected(page) {
  await page.locator(".connection").filter({ hasText: "connected" }).waitFor({ timeout: 20_000 });
}
