import { createHmac, hkdfSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { expect, test, type Page } from "@playwright/test";

// Session lifecycle in a real browser: idle warning and sign-out, keep me
// signed in, password-change revocation and a mid-session role change.
// Like journeys.spec it creates accounts, so it only runs with E2E_SIGNUP=1,
// and it reads the test database directly: instead of receiving the emailed
// code it re-keys the stored challenge to a known one, using the same HMAC
// derivation as server/security/sealing.
test.skip(process.env.E2E_SIGNUP !== "1", "creates accounts; set E2E_SIGNUP=1 against a throwaway database");
// Session rules don't depend on layout; one project keeps sign-ins under the per-IP limit.
test.skip(({ isMobile }) => isMobile, "desktop only");

const prisma = new PrismaClient();
const secret = process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";
const key = Buffer.from(hkdfSync("sha256", secret, "nauricare-sealing", "nauricare:hmac:login-code:v1", 32));
const hmac = (v: string) => createHmac("sha256", key).update(v).digest("base64url");
const MIN = 60_000;
test.setTimeout(120_000);

const PASSWORD = "Journey-test-1234!";

/** A ready patient, made directly in the test database (sign-up has its own test and rate limit). */
async function createPatient(email: string) {
  return prisma.user.create({
    data: {
      email,
      name: "Session Test",
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: "PATIENT",
      privacyConsent: true,
      isEmailVerified: true,
      patientProfile: { create: { country: "Rwanda" } },
    },
  });
}

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await expect(page.locator('input[name="cf-turnstile-response"]').first()).toHaveValue(/.+/, { timeout: 20_000 });
  const since = new Date();
  await page.locator('form button[type="submit"]').first().click();
  await expect(page).toHaveURL(/verify-code/, { timeout: 20_000 });
  return since;
}

async function enterCode(page: Page, email: string, since: Date, remember = false) {
  // Let the send finish first: a failed send (no real inbox here) expires the
  // challenge, which would race with re-keying it below.
  await expect(page.getByText(/We sent a 6-digit code|couldn't send your code/)).toBeVisible({ timeout: 20_000 });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  let c = null;
  for (let i = 0; i < 40 && !c; i++) {
    c = await prisma.loginChallenge.findFirst({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });
    if (!c) await page.waitForTimeout(250);
  }
  await prisma.loginChallenge.update({
    where: { id: c!.id },
    data: { codeHash: hmac(`${c!.id}:246810`), expiresAt: new Date(Date.now() + 600_000) },
  });
  const box = page.getByLabel("Keep me signed in on this device");
  await expect(box).toBeVisible();
  if (remember) await box.check();
  await page.locator('input[inputmode="numeric"]').fill("246810");
  return user;
}

test("idle sign-out, keep me signed in, password change and role change", async ({ page, browser }) => {
  const email = `session+${Date.now()}@example.com`;
  await page.clock.install();
  await createPatient(email);
  const user = await enterCode(page, email, await logIn(page, email));
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  // Role change mid-session: no redirect loop, lands in the new portal.
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
  await prisma.user.update({ where: { id: user.id }, data: { role: "PATIENT" } });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);

  // Idle: warning at 28 min, "Stay signed in" resets, sign-out after 30.
  // Wait until the idle guard is running: one click, recorded as activity.
  await page.getByRole("heading", { level: 1 }).first().click();
  await page.waitForFunction(() => !!localStorage.getItem("nc:last-activity"));
  await page.clock.fastForward(28 * MIN + 5000);
  const dialog = page.getByRole("alertdialog");
  // The fake clock also drives the dialog's open transition: step it until shown.
  for (let i = 0; i < 40 && !(await dialog.isVisible()); i++) await page.clock.runFor(250);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Are you still there?");
  await dialog.getByRole("button", { name: "Stay signed in" }).click();
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

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: "rotated-unusable" } });
  await p2.goto("/dashboard");
  await expect(p2).toHaveURL(/\/login\?ended=revoked/, { timeout: 20_000 });
  await expect(p2.getByText("Your password was changed")).toBeVisible();
  await ctx.close();
  await prisma.user.delete({ where: { id: user.id } });
});
