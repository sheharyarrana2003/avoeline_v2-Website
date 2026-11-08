import { test, expect } from "@playwright/test";
import { DEMO_ENTER_CODE, DEMO_HACKATHON_EVENT_ID } from "./helpers/demo";

/**
 * Phase 10 / O8 Playwright smoke.
 * Requires a running app (`npm run dev`) and seeded demo data for enter/compete.
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

test.describe("hackathon access gate (demo seed defaults)", () => {
  const eventId = DEMO_HACKATHON_EVENT_ID;

  test("enter page shows access reason UI", async ({ page }) => {
    await page.goto(`/events/${eventId}/enter`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 60_000 });
  });

  test("enter code unlocks compete tabs", async ({ page }) => {
    await page.goto(`/events/${eventId}/enter`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    const codeField = page.locator("#access-code");
    await expect(codeField).toBeVisible({ timeout: 60_000 });
    await codeField.fill(DEMO_ENTER_CODE);
    await page.getByRole("button", { name: /open dashboard/i }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/compete`), {
      timeout: 60_000,
    });
    // First entry requires rules acknowledgement before workspace chrome.
    const ack = page.getByRole("button", { name: /i understand/i });
    await expect(ack).toBeVisible({ timeout: 30_000 });
    await ack.click();
    await expect(page.getByRole("heading", { name: /active rules/i })).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(page.getByText(/participant dashboard|phases|tasks|team/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});

/**
 * Full matrix (create/register/Drive/email/certs): manual — docs/O8-full-flow-checklist.md
 * Authenticated tab smoke: e2e/organizer-tabs.spec.ts (demo login).
 * A7 redirects: e2e/a7-redirects.spec.ts
 */
