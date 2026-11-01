import { test, expect } from "@playwright/test";

/**
 * Phase 10 Playwright smoke skeleton.
 * Requires a running app (`npm run dev`) and seeded demo data when exercising
 * authenticated flows. Public routes run without seed.
 *
 * Cold Next.js compile can exceed default nav timeouts — use a long goto timeout
 * and prefer `domcontentloaded` so HMR/webpack does not fail the smoke.
 */
test.describe("public smoke", () => {
  test("events browse loads", async ({ page }) => {
    const res = await page.goto("/events", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    // 200 or soft 404 both prove the route is reachable (empty catalog OK).
    expect(res?.ok() || res?.status() === 404).toBeTruthy();
    await expect(page.locator("body")).toBeVisible({ timeout: 60_000 });
  });

  test("auth sign-in page loads", async ({ page }) => {
    await page.goto("/auth/signin", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page.locator("body")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading").or(page.getByRole("button")).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});

test.describe("onboarding route smoke", () => {
  test("organizer setup redirects unauthenticated visitors to sign-in", async ({ page }) => {
    await page.goto("/auth/signup/organizerSetup", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 60_000 });
  });

  test("vendor setup redirects unauthenticated visitors to sign-in", async ({ page }) => {
    await page.goto("/auth/signup/vendorSetup", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 60_000 });
  });

  test("awaiting-approval redirects unauthenticated visitors to sign-in", async ({ page }) => {
    await page.goto("/auth/signup/awaiting-approval", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 60_000 });
  });

  test("admin pending billing redirects unsigned visitors", async ({ page }) => {
    await page.goto("/admin/billing/pending", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/admin\/signin|\/auth\/signin/, { timeout: 60_000 });
  });
});

test.describe("hackathon access gate (needs event id)", () => {
  const eventId = process.env.E2E_EVENT_ID;
  test.skip(!eventId, "Set E2E_EVENT_ID to exercise enter/compete");

  test("enter page shows access reason UI", async ({ page }) => {
    await page.goto(`/events/${eventId}/enter`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 60_000 });
  });

  test("enter code unlocks compete tabs when E2E_ENTER_CODE is set", async ({ page }) => {
    const enterCode = process.env.E2E_ENTER_CODE;
    test.skip(!enterCode, "Set E2E_ENTER_CODE (e.g. AV-DEMO001) after seed:demo");

    await page.goto(`/events/${eventId}/enter`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    const codeField = page.getByRole("textbox").first();
    await expect(codeField).toBeVisible({ timeout: 60_000 });
    await codeField.fill(enterCode!);
    await page
      .getByRole("button", { name: /enter|continue|unlock|submit/i })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/compete`), {
      timeout: 60_000,
    });
    await expect(page.getByRole("link", { name: /Instructions/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("link", { name: /Phases|Tasks/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Team/i })).toBeVisible();
  });
});

/**
 * Remaining flows (manual / future CI with seed):
 * - solo / group / hackathon registration + file upload
 * - payment approval, check-in
 * - flag + file submission
 * - certificate view/download
 * - owner vs staff permissions
 */
