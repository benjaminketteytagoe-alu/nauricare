import { expect, test } from "@playwright/test";
import { createUser, db, enterCode, logIn, SIGNUP_ENABLED, SIGNUP_SKIP_REASON } from "./helpers";

// Session lifecycle in a real browser: idle warning and sign-out, keep me
// signed in, password-change revocation and a mid-session role change.
test.skip(!SIGNUP_ENABLED, SIGNUP_SKIP_REASON);
// Session rules don't depend on layout; one project keeps sign-ins under the per-IP limit.
test.skip(({ isMobile }) => isMobile, "desktop only");
test.setTimeout(120_000);

const MIN = 60_000;

test("idle sign-out, keep me signed in, password change and role change", async ({ page, browser }) => {
  const email = `session+${Date.now()}@example.com`;
  await page.clock.install();
  await createUser("PATIENT", email);
  const user = await enterCode(page, email, await logIn(page, email));
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  // Role change mid-session: no redirect loop, lands in the new portal.
  await db().user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
  await db().user.update({ where: { id: user.id }, data: { role: "PATIENT" } });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);

  // Idle: warning at 28 min, "Stay signed in" resets, sign-out after 30.
  // Wait until the idle guard is running: click until it records activity
  // (an early click can land before hydration). Polling runs in the test
  // runner because the page's own timers are faked.
  const heading = page.getByRole("heading", { level: 1 }).first();
  await expect
    .poll(async () => {
      await heading.click();
      return page.evaluate(() => !!localStorage.getItem("nc:last-activity"));
    })
    .toBe(true);
  await page.clock.fastForward(28 * MIN + 5000);
  const dialog = page.getByRole("alertdialog");
  // The fake clock also drives the dialog's open transition: step it until shown.
  for (let i = 0; i < 40 && !(await dialog.isVisible()); i++) await page.clock.runFor(250);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Are you still there?");
  // "Stay signed in" reports activity to the server; let that finish before
  // jumping the clock, or its late response would restore the cookie.
  const reported = page.waitForResponse(
    (r) => r.url().endsWith("/api/auth/session") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Stay signed in" }).click();
  await reported;
  await expect(dialog).toBeHidden();
  await page.clock.fastForward(31 * MIN);
  await expect(page).toHaveURL(/\/login\?ended=idle/, { timeout: 20_000 });
  await expect(page.getByRole("status").filter({ hasText: "inactivity" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  // Remembered: no idle guard; a password change ends it on the next check.
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.clock.install();
  await enterCode(p2, email, await logIn(p2, email), true);
  await expect(p2).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await p2.clock.fastForward(45 * MIN);
  await expect(p2.getByRole("alertdialog")).toHaveCount(0);
  await expect(p2).toHaveURL(/\/dashboard/);

  await db().user.update({ where: { id: user.id }, data: { passwordHash: "rotated-unusable" } });
  await p2.goto("/dashboard");
  await expect(p2).toHaveURL(/\/login\?ended=revoked/, { timeout: 20_000 });
  await expect(p2.getByText("Your password was changed")).toBeVisible();
  await ctx.close();
  await db().user.delete({ where: { id: user.id } });
});
