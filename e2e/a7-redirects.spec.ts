import { test, expect } from "@playwright/test";
import { DEMO_HACKATHON_EVENT_ID, DEMO_ORGANIZER_ID, DEMO_TRACK_ID } from "./helpers/demo";

const gotoOpts = { waitUntil: "domcontentloaded" as const, timeout: 120_000 };

/**
 * O0/A7 removed surfaces must redirect (no product UI restored).
 */
test.describe("A7 removed-route redirects", () => {
  test("public mentors redirects to tracks", async ({ page }) => {
    await page.goto(`/events/${DEMO_HACKATHON_EVENT_ID}/mentors`, gotoOpts);
    await expect(page).toHaveURL(new RegExp(`/events/${DEMO_HACKATHON_EVENT_ID}/tracks/?$`), {
      timeout: 60_000,
    });
  });

  test("public leaderboard redirects to competition detail", async ({ page }) => {
    await page.goto(
      `/events/${DEMO_HACKATHON_EVENT_ID}/tracks/${DEMO_TRACK_ID}/leaderboard`,
      gotoOpts,
    );
    await expect(page).toHaveURL(
      new RegExp(`/events/${DEMO_HACKATHON_EVENT_ID}/tracks/${DEMO_TRACK_ID}/?$`),
      { timeout: 60_000 },
    );
  });

  test("organizer event /teams redirects to attendees or sign-in", async ({ page }) => {
    // Unauthenticated → sign-in (next=…/teams); authenticated covered in organizer-tabs.
    // Soft-skip if local server is down (net::ERR_*).
    let res;
    try {
      res = await page.goto(
        `/organizer/${DEMO_ORGANIZER_ID}/events/${DEMO_HACKATHON_EVENT_ID}/teams`,
        gotoOpts,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      test.skip(/ERR_|ECONNREFUSED|suspended/i.test(msg), `Dev server unreachable: ${msg}`);
      throw err;
    }
    expect(
      res?.ok() || (res?.status() ?? 500) < 500 || res?.status() === 307 || res?.status() === 302,
    ).toBeTruthy();
    await expect(page).toHaveURL(/\/auth\/signin|\/attendees\/?$/, { timeout: 60_000 });
  });
});
