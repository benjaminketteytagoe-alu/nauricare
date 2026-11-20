import { createHmac, hkdfSync, randomInt } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient, type Role } from "@prisma/client";
import { expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";

// Shared by the e2e specs. Helpers that touch the database or create
// accounts are only used by specs gated on E2E_SIGNUP=1 (a throwaway DB).

export const ENFORCE_AXE = process.env.AXE_ENFORCE === "1";
const PASSWORD = "Journey-test-1234!";
export const SIGNUP_ENABLED = process.env.E2E_SIGNUP === "1";
export const SIGNUP_SKIP_REASON = "creates accounts; set E2E_SIGNUP=1 against a throwaway database";

let client: PrismaClient | undefined;
export const db = () => (client ??= new PrismaClient());

/** Serious/critical axe violations on the current page, including 1:1 (invisible) text. */
export async function seriousA11yViolations(page: Page) {
  // Scroll-triggered reveals keep below-the-fold content at opacity 0, and
  // axe skips invisible nodes. Scroll through once so every section is checked.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);

  const { violations, incomplete } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  // axe files text that is the same colour as its background (1:1) under
  // "incomplete", assuming it may be deliberately hidden. In this app it never
  // is, so treat it as a contrast failure.
  const invisibleText = incomplete
    .filter((v) => v.id === "color-contrast")
    .flatMap((v) => v.nodes)
    .filter((n) => (n.any[0]?.data as { messageKey?: string } | undefined)?.messageKey === "equalRatio");
  if (invisibleText.length) {
    serious.push({
      id: "color-contrast-equal",
      impact: "serious",
      nodes: invisibleText,
      help: "Text matches its background",
    } as (typeof serious)[number]);
  }
  return serious;
}

/** A ready account made directly in the test database. Providers are approved. */
export async function createUser(role: Role, email: string) {
  return db().user.create({
    data: {
      email,
      name: `E2E ${role.toLowerCase()}`,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role,
      privacyConsent: true,
      isEmailVerified: true,
      isVerified: role === "PROVIDER",
      ...(role === "PATIENT" ? { patientProfile: { create: { country: "Rwanda" } } } : {}),
      ...(role === "PROVIDER"
        ? {
            practitionerProfile: {
              create: {
                specialty: "Gynaecology",
                clinicName: "E2E Clinic",
                location: "Kigali",
                isVerified: true,
              },
            },
          }
        : {}),
    },
  });
}

/**
 * Give this browser context its own client IP for the app's per-IP rate
 * limits (sign-in is 5/min), so tests and CI retries don't trip over each
 * other. Only requests to the app get the header; third parties (Turnstile)
 * are untouched.
 */
export async function ownClientIp(page: Page) {
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  const origin = new URL(
    page.url() === "about:blank" ? (process.env.E2E_BASE_URL ?? "http://localhost:3100") : page.url(),
  ).origin;
  await page.context().route(
    (url) => url.origin === origin,
    (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }),
  );
}

/** Fill the login form; returns the moment just before submitting. */
export async function logIn(page: Page, email: string) {
  await ownClientIp(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await expect(page.locator('input[name="cf-turnstile-response"]').first()).toHaveValue(/.+/, { timeout: 20_000 });
  const since = new Date();
  await page.locator('form button[type="submit"]').first().click();
  await expect(page).toHaveURL(/verify-code/, { timeout: 20_000 });
  return since;
}

// Same derivation as server/security/sealing keyedHash("login-code", …).
const codeKey = () =>
  Buffer.from(
    hkdfSync(
      "sha256",
      process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "",
      "nauricare-sealing",
      "nauricare:hmac:login-code:v1",
      32,
    ),
  );

/**
 * Pass the emailed-code step without an inbox: wait for the send to finish
 * (a failed send expires the challenge), then re-key the newest challenge to
 * a known code and type it.
 */
export async function enterCode(page: Page, email: string, since: Date, remember = false) {
  await expect(page.getByText(/We sent a 6-digit code|couldn't send your code/)).toBeVisible({ timeout: 20_000 });
  const user = await db().user.findUniqueOrThrow({ where: { email } });
  let c = null;
  for (let i = 0; i < 40 && !c; i++) {
    c = await db().loginChallenge.findFirst({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });
    if (!c) await page.waitForTimeout(250);
  }
  const code = "246810";
  await db().loginChallenge.update({
    where: { id: c!.id },
    data: {
      codeHash: createHmac("sha256", codeKey()).update(`${c!.id}:${code}`).digest("base64url"),
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  if (remember) await page.getByLabel("Keep me signed in on this device").check();
  await page.locator('input[inputmode="numeric"]').fill(code);
  return user;
}

/** Create an account of `role`, sign in and land in its portal. */
export async function signInAs(page: Page, role: Role, tag: string) {
  const email = `e2e-${tag}+${Date.now()}@example.com`;
  await createUser(role, email);
  await enterCode(page, email, await logIn(page, email));
  await expect(page).toHaveURL(new RegExp({ PATIENT: "/dashboard", PROVIDER: "/provider", ADMIN: "/admin" }[role]), {
    timeout: 20_000,
  });
  return email;
}
