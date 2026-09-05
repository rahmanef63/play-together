import { type BrowserContext, expect, type FrameLocator, type Page } from "@playwright/test";

export const accountPassword = "testpass";

import flightConfig from "../../games/flight-trainer/game.config.json" with { type: "json" };
import skyConfig from "../../games/sky-strike/game.config.json" with { type: "json" };
import turboConfig from "../../games/turbo-circuit/game.config.json" with { type: "json" };
export const turboCircuit = `${turboConfig.game.id}@${turboConfig.game.version}`;
export const skyStrike = `${skyConfig.game.id}@${skyConfig.game.version}`;
export const flightTrainer = `${flightConfig.game.id}@${flightConfig.game.version}`;
export const realtimeHealthUrl =
  process.env.E2E_REALTIME_HEALTH_URL ?? "http://127.0.0.1:8787/healthz";

export async function signUp(page: Page, name: string, email: string): Promise<void> {
  await page.goto("/");
  await signUpAtCurrentLocation(page, name, email);
  await expect(page.locator(".app-shell--lobby")).toBeVisible();
}

export async function signUpAtCurrentLocation(
  page: Page,
  name: string,
  email: string,
): Promise<void> {
  await expect(page.getByRole("heading", { name: "Your phone is the console." })).toBeVisible();
  const form = page.locator(".auth-card form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(accountPassword);
  await form.getByRole("button", { name: "Create account" }).click();
}

export async function createRoom(
  page: Page,
  options: {
    name: string;
    gameKey: string;
    maxPlayers: number;
    visibility: "public" | "private";
    roomPassword?: string;
  },
): Promise<string> {
  const form = page.locator(".create-panel form");
  const game = form.locator('select[name="game"]');
  await expect(game).toBeVisible();
  await game.selectOption(options.gameKey);
  await form.locator('input[name="name"]').fill(options.name);
  await form.locator('select[name="visibility"]').selectOption(options.visibility);
  await form.locator('input[name="maxPlayers"]').fill(String(options.maxPlayers));
  if (options.roomPassword) {
    await form.locator('input[name="password"]').fill(options.roomPassword);
  }
  await form.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+$/);
  const code = new URL(page.url()).pathname.split("/").at(-1);
  if (!code) throw new Error("Room code missing from URL");
  await expect(page.locator(".room-code strong")).toHaveText(code);
  return code;
}

export async function joinFromPublicCard(
  page: Page,
  roomName: string,
  roomCode: string,
): Promise<void> {
  await page
    .locator(".console-panel-tabs")
    .getByRole("button", { name: "Rooms", exact: true })
    .click();
  const publicCard = page.locator(".room-card").filter({ hasText: roomName });
  await expect(publicCard).toBeVisible();
  await publicCard.getByRole("button", { name: "Join" }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${roomCode}$`));
  await expect(page.getByRole("heading", { name: "How are you playing?" })).toBeVisible();
}

export async function expectGameFrame(page: Page): Promise<void> {
  await expect(page.locator(".connection")).toHaveText("connected", { timeout: 20_000 });
  await expect(page.locator("iframe.game-frame")).toBeVisible();
}

export async function expectPregame(page: Page): Promise<void> {
  await expect(page.locator(".pregame-menu")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("iframe.game-frame")).toHaveCount(0);
  await expect(page.locator(".connection")).toHaveText("idle");
}

export async function startGame(page: Page): Promise<void> {
  await expectPregame(page);
  await expect(page.locator(".room-invite-qr img").first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Start Game" }).click();
  await expectGameFrame(page);
}

export async function closeContext(context: BrowserContext): Promise<void> {
  try {
    await context.close();
  } catch {
    // A failed assertion may already have closed a context.
  }
}

export async function useStick(
  page: Page,
  frame: FrameLocator,
  controlId: string,
  x: number,
  y: number,
  holdMs = 80,
) {
  const stick = frame.locator(`[data-control-id="${controlId}"]`);
  await expect(stick).toBeVisible({ timeout: 20_000 });
  const box = await stick.boundingBox();
  if (!box) throw new Error(`Stick ${controlId} has no bounding box`);
  const targetX = box.x + box.width * (0.5 + x * 0.36);
  const targetY = box.y + box.height * (0.5 - y * 0.36);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 4 });
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}
