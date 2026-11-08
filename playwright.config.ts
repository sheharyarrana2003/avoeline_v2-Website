import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE_PATH } from "./e2e/helpers/demo";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, timeout: 120_000 },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts|organizer-tabs\.spec\.ts/,
    },
    {
      name: "chromium-auth",
      dependencies: ["setup"],
      testMatch: /organizer-tabs\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_PATH,
      },
    },
  ],
});
