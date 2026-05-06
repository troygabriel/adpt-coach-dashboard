import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = "tests/.auth/coach.json";

setup("authenticate as coach", async ({ page }) => {
  const email = process.env.TEST_COACH_EMAIL;
  const password = process.env.TEST_COACH_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_COACH_EMAIL and TEST_COACH_PASSWORD must be set in .env.local " +
        "for the QA harness to authenticate. Add a dedicated test coach " +
        "account in Supabase, then export the credentials."
    );
  }

  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Land on a coach-only route (dashboard layout would 403 a non-coach).
  await page.waitForURL(/\/dashboard|\/clients/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 10_000,
  });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
