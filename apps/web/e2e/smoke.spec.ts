import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = ["/", "/login", "/signup", "/privacy", "/terms", "/consent", "/waitlist"];

// Until the design-system pass lands, accessibility violations are reported as
// annotations. Set AXE_ENFORCE=1 to make serious/critical violations fail.
const ENFORCE_AXE = process.env.AXE_ENFORCE === "1";

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok" });
});

test("readiness probe reaches the database", async ({ request }) => {
  const res = await request.get("/api/health/ready");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok", checks: { database: "ok" } });
});

for (const path of PUBLIC_PAGES) {
  test(`public page ${path} renders and is accessible`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const res = await page.goto(path);
    expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
    await expect(page).toHaveTitle(/NauriCare/);
    await expect(page.locator("body")).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    for (const v of serious) {
      testInfo.annotations.push({
        type: "a11y",
        description: `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`,
      });
    }
    if (ENFORCE_AXE) expect(serious.map((v) => v.id)).toEqual([]);

    expect(errors, `uncaught errors on ${path}`).toEqual([]);
  });
}

for (const path of ["/dashboard", "/provider", "/admin"]) {
  test(`signed-out visitors to ${path} are sent to sign in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}
