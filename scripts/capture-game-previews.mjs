import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { discoverGames } from "./discover-games.mjs";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const outputDir = path.resolve("apps/web/public/game-previews");
const password = "PreviewPass123!";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const requestedGameId = process.env.PREVIEW_GAME_ID?.trim();
const discoveredGames = (await discoverGames()).map(({ id, config }) => ({
  id,
  key: `${id}@${config.game.version}`,
  title: config.game.title,
  minPlayers: config.game.minPlayers,
  maxPlayers: config.game.maxPlayers,
}));
const games = requestedGameId
  ? discoveredGames.filter((game) => game.id === requestedGameId)
  : discoveredGames;
if (requestedGameId && games.length === 0) {
  throw new Error(`Unknown PREVIEW_GAME_ID: ${requestedGameId}`);
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (let batch = 0; batch < Math.ceil(games.length / 4); batch += 1) {
    const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const host = await context.newPage();
    await signUp(
      host,
      `Preview Host ${batch + 1} ${runId}`,
      `preview-host-${batch + 1}-${runId}@example.test`,
    );
    try {
      for (const game of games.slice(batch * 4, batch * 4 + 4)) await capture(host, game);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

async function capture(host, game) {
  const code = await createRoom(host, game);
  const guests = await joinRequiredGuests(code, game.minPlayers - 1);
  try {
    await host.getByRole("button", { name: /Handheld console/ }).click();
    await expectPregame(host);
    await host.getByRole("button", { name: "Start Game" }).click();
    await expectConnected(host);
    const screen = host.frameLocator("iframe.game-frame").locator(".handheld-screen");
    await screen.waitFor({ state: "visible", timeout: 20_000 });
    await host.waitForTimeout(1_200);
    await screen.screenshot({ path: path.join(outputDir, `${game.id}.png`) });
    console.log(`Captured ${game.id}@${game.key.split("@")[1]}`);
  } finally {
    for (const guest of guests) await guest.context.close();
    await host.getByRole("button", { name: "← Room", exact: true }).click();
    await host.getByRole("button", { name: "Close room" }).click();
    await host.waitForURL(`${baseUrl}/`);
  }
}

async function joinRequiredGuests(code, count) {
  const guests = [];
  for (let index = 0; index < count; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUp(
      page,
      `Preview Guest ${index + 1} ${runId}`,
      `preview-guest-${index + 1}-${runId}-${code}@example.test`,
    );
    await page.goto(`${baseUrl}/room/${code}`);
    const join = page.getByRole("button", { name: "Join room" });
    await join.waitFor({ state: "visible", timeout: 20_000 });
    await join.click();
    await page.getByRole("heading", { name: "How are you playing?" }).waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: /Handheld console/ }).click();
    await expectPregame(page);
    guests.push({ context, page });
  }
  return guests;
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
  await form.locator('input[name="maxPlayers"]').fill(String(Math.max(game.minPlayers, 1)));
  await form.getByRole("button", { name: "Create room" }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]+$/, { timeout: 20_000 });
  return new URL(page.url()).pathname.split("/").at(-1);
}

async function expectPregame(page) {
  await page.locator(".pregame-menu").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".connection").filter({ hasText: "idle" }).waitFor({ timeout: 20_000 });
}

async function expectConnected(page) {
  await page.locator(".connection").filter({ hasText: "connected" }).waitFor({ timeout: 20_000 });
}
