import { expect, test } from "@playwright/test";
import { ownClientIp } from "./helpers";

// Sign-up signs the person straight in and goes to the emailed-code step:
// no verification link, no second password entry. Needs Cloudflare's
// always-pass Turnstile test keys (site key at build, secret at runtime).
// It creates an account, so it only runs where E2E_SIGNUP=1 (the CI
// database), never in the staging or production smoke runs.
test.skip(process.env.E2E_SIGNUP !== "1", "creates accounts; set E2E_SIGNUP=1 against a throwaway database");

test("a new patient goes from sign-up straight to the sign-in code", async ({ page }, testInfo) => {
  const id = `${Date.now()}${testInfo.project.name === "mobile" ? 1 : 0}`;
  await ownClientIp(page); // sign-up is rate-limited per IP
  await page.goto("/signup");
  await page.getByLabel("Full Name").fill("Journey Test");
  await page.getByLabel("Email Address").fill(`journey+${id}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Journey-test-1234!");
  await page.getByLabel("Date of Birth").fill("1990-04-12");
  await page.getByLabel("Phone Number").fill(`7${id.slice(-8)}`);
  await page.locator("#privacyConsent").check();
  // The always-pass widget resolves on its own; wait for its hidden token.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/verify-code\?next=%2Fdashboard/, { timeout: 20_000 });
  // A signed-in session waiting for its code, not a login form.
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
