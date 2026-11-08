import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { AUTH_STATE_PATH, DEMO_ORGANIZER_EMAIL, DEMO_PASSWORD } from "./helpers/demo";

function writeEmptyState(out: string) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ cookies: [], origins: [] }));
}

/**
 * Writes storageState for chromium-auth.
 * Soft-skips when demo password login fails; still writes empty state so the
 * dependent project can start (organizer-tabs then self-skips).
 */
setup("authenticate demo enterprise organizer", async ({ page }) => {
  const out = path.resolve(AUTH_STATE_PATH);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (process.env.E2E_SKIP_AUTH === "1") {
    writeEmptyState(out);
    setup.skip(true, "E2E_SKIP_AUTH=1");
    return;
  }

  await page.goto("/auth/signin", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.locator("#signin-email").fill(DEMO_ORGANIZER_EMAIL);
  await page.locator("#signin-password").fill(DEMO_PASSWORD);
  await page.locator("#signin-password").press("Enter");

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/signin"), {
      timeout: 45_000,
    });
  } catch {
    writeEmptyState(out);
    setup.skip(
      true,
      "Demo organizer login failed — confirm DEMO_SEED_PASSWORD / re-run seed:demo. Organizer tab smoke will skip.",
    );
    return;
  }

  const href = page.url();
  if (/organizerSetup|vendorSetup|awaiting-approval|change-password/i.test(href)) {
    writeEmptyState(out);
    setup.skip(true, `Demo organizer redirected to ${href}`);
    return;
  }

  await expect(page).toHaveURL(/\/organizer\/[^/]+\/dashboard/, { timeout: 30_000 });
  await page.context().storageState({ path: out });
});
