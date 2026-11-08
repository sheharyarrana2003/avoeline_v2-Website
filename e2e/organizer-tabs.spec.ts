import fs from "node:fs";
import { test, expect } from "@playwright/test";
import {
  AUTH_STATE_PATH,
  DEMO_HACKATHON_EVENT_ID,
  DEMO_ORGANIZER_ID,
  DEMO_SUMMIT_EVENT_ID,
} from "./helpers/demo";

const gotoTimeout = { waitUntil: "domcontentloaded" as const, timeout: 120_000 };

function authStateLooksEmpty(): boolean {
  try {
    const raw = fs.readFileSync(AUTH_STATE_PATH, "utf8");
    const json = JSON.parse(raw) as { cookies?: unknown[] };
    return !Array.isArray(json.cookies) || json.cookies.length === 0;
  } catch {
    return true;
  }
}

async function expectTabOk(page: import("@playwright/test").Page, path: string, heading?: RegExp) {
  const res = await page.goto(path, gotoTimeout);
  expect(res?.ok() || (res?.status() ?? 500) < 500).toBeTruthy();
  await expect(page.locator("body")).toBeVisible({ timeout: 60_000 });
  // Must not bounce to sign-in when storageState is valid.
  await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 15_000 });
  if (heading) {
    await expect(page.getByRole("heading").filter({ hasText: heading }).first()).toBeVisible({
      timeout: 60_000,
    });
  }
}

test.describe("organizer event tab smoke (demo seed)", () => {
  test.beforeEach(() => {
    test.skip(
      authStateLooksEmpty(),
      "No demo organizer session — auth.setup soft-skipped (fix DEMO_SEED_PASSWORD).",
    );
  });

  test("summit shared tabs load", async ({ page }) => {
    const base = `/organizer/${DEMO_ORGANIZER_ID}/events/${DEMO_SUMMIT_EVENT_ID}`;
    await expectTabOk(page, base);
    await expectTabOk(page, `${base}/attendees`);
    await expectTabOk(page, `${base}/access`);
    await expectTabOk(page, `${base}/agenda`);
    await expectTabOk(page, `${base}/speakers`);
    await expectTabOk(page, `${base}/sponsors`);
    await expectTabOk(page, `${base}/expenses`);
    await expectTabOk(page, `${base}/staff`);
    await expectTabOk(page, `${base}/files`);
    await expectTabOk(page, `${base}/exports`);
    await expectTabOk(page, `${base}/certificates`);
  });

  test("hackathon tabs load and Competitors nav is absent", async ({ page }) => {
    const base = `/organizer/${DEMO_ORGANIZER_ID}/events/${DEMO_HACKATHON_EVENT_ID}`;
    await expectTabOk(page, base);
    await expect(page.getByRole("link", { name: /^Competitors$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Competitions$/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expectTabOk(page, `${base}/competitions`);
    await expectTabOk(page, `${base}/tasks`);
    await expectTabOk(page, `${base}/submissions`);
    await expectTabOk(page, `${base}/scoreboard`);
    await expectTabOk(page, `${base}/settings`);
  });

  test("event /teams bookmark redirects to attendees", async ({ page }) => {
    await page.goto(
      `/organizer/${DEMO_ORGANIZER_ID}/events/${DEMO_HACKATHON_EVENT_ID}/teams`,
      gotoTimeout,
    );
    await expect(page).toHaveURL(/\/attendees\/?$/, { timeout: 60_000 });
  });
});
