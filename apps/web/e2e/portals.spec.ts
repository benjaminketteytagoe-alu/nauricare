import type { Role } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { db, ENFORCE_AXE, seriousA11yViolations, signInAs, SIGNUP_ENABLED, SIGNUP_SKIP_REASON } from "./helpers";

// Every signed-in page, per role, must render without errors and pass axe
// (serious/critical WCAG 2.2 AA). One sign-in per role, desktop only: the
// login is rate-limited per IP and the pages are checked on mobile by layout
// work, not by repeating sign-ins.
test.skip(!SIGNUP_ENABLED, SIGNUP_SKIP_REASON);

const PAGES: Record<Role, string[]> = {
  PATIENT: [
    "/dashboard",
    "/dashboard/symptoms",
    "/dashboard/cycle",
    "/dashboard/records",
    "/dashboard/prescriptions",
    "/dashboard/providers",
    "/dashboard/referrals",
    "/dashboard/messages",
    "/dashboard/articles",
    "/dashboard/community",
    "/dashboard/settings",
    "/dashboard/feedback",
    "/dashboard/notifications",
  ],
  PROVIDER: [
    "/provider",
    "/provider/roster",
    "/provider/schedule",
    "/provider/prescriptions",
    "/provider/messages",
    "/provider/settings",
    "/provider/feedback",
    "/provider/notifications",
  ],
  ADMIN: [
    "/admin",
    "/admin/providers",
    "/admin/sourcing",
    "/admin/pharmacies",
    "/admin/feedback",
    "/admin/audit",
    "/admin/notifications",
    "/admin/settings",
  ],
};

for (const role of Object.keys(PAGES) as Role[]) {
  test.describe.serial(`${role.toLowerCase()} portal`, () => {
    let page: Page;
    let email: string;

    test.beforeAll(async ({ browser }, testInfo) => {
      // Skipping here (not per test) also stops the mobile project signing in.
      test.skip(testInfo.project.name !== "desktop", "desktop only");
      page = await (await browser.newContext()).newPage(); // axe needs a context-owned page
      email = await signInAs(page, role, role.toLowerCase());
    });
    test.afterAll(async () => {
      if (!page) return;
      await page.context().close();
      await db().user.deleteMany({ where: { email } });
    });

    for (const path of PAGES[role]) {
      test(`${path} renders and is accessible`, async ({}, testInfo) => {
        const errors: string[] = [];
        const onError = (e: Error) => errors.push(e.message);
        page.on("pageerror", onError);
        const res = await page.goto(path);
        expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
        await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`));
        await expect(page.getByRole("main").first()).toBeVisible();

        const serious = await seriousA11yViolations(page);
        for (const v of serious) {
          testInfo.annotations.push({
            type: "a11y",
            description: `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help} — ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(" "))
              .join(" | ")}`,
          });
        }
        page.off("pageerror", onError);
        if (ENFORCE_AXE) expect(serious.map((v) => v.id)).toEqual([]);
        expect(errors, `uncaught errors on ${path}`).toEqual([]);
      });
    }
  });
}
