import { expect, test } from "@playwright/test";

test("invalid credentials are actionable and never expose raw backend errors", async ({ page }) => {
  await page.goto("/");
  await page.locator(".segmented").getByRole("button", { name: "Sign in", exact: true }).click();
  const form = page.locator(".auth-card form");
  await form.locator('[name="email"]').fill(`auth-negative-${Date.now()}@example.test`);
  await form.locator('[name="password"]').fill("Invalid-qa-password-123");
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("Email or password is incorrect");
  await expect(form.getByRole("alert")).not.toContainText(
    /Server Error|Called by client|InvalidAccountId|InvalidSecret/,
  );
  await expect(form.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("cancelled Google callback offers a return path without restarting OAuth", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?authCallback=google");
  await expect(page.getByRole("heading", { name: "Sign-in was not completed" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Google sign-in was not completed");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Back to sign in" }).click();
  await expect(page.locator(".auth-card form")).toBeVisible();
  expect(errors).toEqual([]);
});

test("invalid callback codes are removed and failures do not leave an infinite spinner", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?authCallback=google&code=invalid-qa-code");
  await expect(page.getByRole("heading", { name: "Sign-in was not completed" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("alert")).not.toContainText(
    /Server Error|Called by client|invalid-qa-code/,
  );
  expect(errors).toEqual([]);
});
