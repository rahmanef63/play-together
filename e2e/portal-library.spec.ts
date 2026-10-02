import { expect, test } from "@playwright/test";
import { signUp, turboCircuit } from "./support/multiplayer";

test("library filters keep preview, setup and empty states on the same game", async ({ page }) => {
  await signUp(page, "Library QA", `library-${Date.now()}@example.test`);
  const search = page.getByRole("searchbox", { name: "Search games" });
  const stageTitle = page.locator(".game-stage h1");
  const setupGame = page.locator('.create-panel select[name="game"]');
  await search.fill("Sky Strike");
  await expect(stageTitle).toHaveText("Sky Strike");
  await expect(setupGame).toHaveValue(/^sky-strike@/);
  await expect(page.locator(".game-picker .game-preview-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Save favorite" }).click();
  await search.fill("no-matching-game");
  await expect(stageTitle).toHaveText("No matching games");
  await expect(page.getByRole("button", { name: "Create room", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Surprise me" })).toBeDisabled();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(stageTitle).toHaveText("Sky Strike");
  await expect(setupGame).toHaveValue(/^sky-strike@/);
  await setupGame.selectOption(turboCircuit);
  await expect(stageTitle).toHaveText("Turbo Circuit");
  await expect(page.getByRole("button", { name: "Favorites", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(search).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  await search.fill("Sky Strike");
  await page.getByRole("button", { name: "Set up room", exact: true }).click();
  await expect(setupGame).toHaveValue(/^sky-strike@/);
  await expect(page.getByRole("button", { name: "Create room", exact: true })).toBeVisible();
});

test("account modes expose selection and the mobile account menu restores keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const modes = page.getByRole("group", { name: "Account mode" });
  await expect(modes.getByRole("button", { name: "Create account" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await modes.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(modes.getByRole("button", { name: "Sign in", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await modes.getByRole("button", { name: "Create account" }).click();
  await signUp(page, "Keyboard QA", `keyboard-${Date.now()}@example.test`);
  const trigger = page.getByRole("button", { name: "Open account menu" });
  await trigger.click();
  const panel = page.getByRole("region", { name: "Account", exact: true });
  await expect(panel.getByRole("button", { name: "Sign in another device" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "Sign out", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "App navigation" })
      .getByRole("button", { name: "Home", exact: true }),
  ).toBeFocused();
});
