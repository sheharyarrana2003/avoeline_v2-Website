/**
 * Demo seed helpers for O8 Playwright.
 * Defaults match a typical `npm run seed:demo` cast; override via env after re-seed.
 */
export const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "AvoelineDemo1!";
export const DEMO_ORGANIZER_EMAIL =
  process.env.E2E_ORGANIZER_EMAIL || "org.enterprise@avoeline.demo";

export const DEMO_ORGANIZER_ID =
  process.env.E2E_ORGANIZER_ID || "d4c31158-ae84-4d19-97e7-0d2640304c9b";

export const DEMO_SUMMIT_EVENT_ID =
  process.env.E2E_SUMMIT_EVENT_ID || "b6808e06-6ce6-470c-93db-083ab0552086";

export const DEMO_HACKATHON_EVENT_ID =
  process.env.E2E_EVENT_ID || "d88dcb56-cf86-4b14-82c7-4999991ff3e7";

export const DEMO_TRACK_ID = process.env.E2E_TRACK_ID || "88b787a9-f27a-4420-a6b3-c1bda9ae9795";

export const DEMO_ENTER_CODE = process.env.E2E_ENTER_CODE || "AV-DEMO001";

export const AUTH_STATE_PATH = "e2e/.auth/organizer.json";
