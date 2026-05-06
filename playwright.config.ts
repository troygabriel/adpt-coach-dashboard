import { defineConfig, devices } from "@playwright/test";

/**
 * QA harness for the coach dashboard. Runs against the local dev server.
 *
 * Auth: tests that exercise authenticated routes use storage state seeded by
 * tests/auth.setup.ts, which signs in via the live UI using TEST_COACH_EMAIL
 * and TEST_COACH_PASSWORD from .env.local. If those vars aren't set, the
 * setup test fails with a clear error and authenticated tests skip.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/coach.json",
      },
      dependencies: ["setup"],
    },
  ],
});
