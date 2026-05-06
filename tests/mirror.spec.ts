import { test, expect } from "@playwright/test";

test.describe("Client Mirror — sidebar swap + compliance row", () => {
  async function openFirstClient(page: import("@playwright/test").Page) {
    await page.goto("/clients");
    const firstRow = page
      .getByRole("row")
      .filter({ hasText: /\bActive\b/ })
      .first();
    if ((await firstRow.count()) === 0) {
      test.skip(true, "No active clients in the test account");
    }
    await firstRow.click();
  }

  test("entering a client swaps the sidebar to client context", async ({ page }) => {
    await openFirstClient(page);
    await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+/);

    // Client-context sidebar shows Dashboard sub-page nav and a Return-to-overview link.
    await expect(page.getByRole("link", { name: /return to overview/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
    // Global nav items should NOT be visible in the new sidebar.
    await expect(page.getByRole("link", { name: /^home$/i })).toHaveCount(0);
  });

  test("compliance row renders with 4 weeks", async ({ page }) => {
    await openFirstClient(page);

    await expect(page.getByText(/workout compliance/i)).toBeVisible();
    await expect(page.getByText(/2 weeks ago/i)).toBeVisible();
    await expect(page.getByText(/last week/i)).toBeVisible();
    await expect(page.getByText(/this week/i)).toBeVisible();
    await expect(page.getByText(/next week/i)).toBeVisible();
  });

  test("Return to overview navigates back to /clients", async ({ page }) => {
    await openFirstClient(page);
    await page.getByRole("link", { name: /return to overview/i }).click();
    await expect(page).toHaveURL(/\/clients$/);
  });

  test("Calendar sub-page renders inside mirror context", async ({ page }) => {
    await openFirstClient(page);
    await page.getByRole("link", { name: /^calendar$/i }).click();
    await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+\/calendar/);
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    // Mirror sidebar still present
    await expect(page.getByRole("link", { name: /return to overview/i })).toBeVisible();
    // Per-client view: client filter dropdown is hidden
    await expect(page.locator('[role="combobox"]')).toHaveCount(0);
  });

  test("Notes sub-page renders + composer is visible", async ({ page }) => {
    await openFirstClient(page);
    await page.getByRole("link", { name: /^notes$/i }).click();
    await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+\/notes/);
    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
    await expect(page.getByPlaceholder(/add a note/i)).toBeVisible();
  });
});
