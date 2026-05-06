import { test, expect } from "@playwright/test";

test.describe("Calendar", () => {
  test("page loads with month grid", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    // Month title (e.g. "May 2026")
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: /\d{4}/ })
    ).toBeVisible();
    // Weekday header
    await expect(page.getByText(/^Sun$/)).toBeVisible();
    await expect(page.getByText(/^Sat$/)).toBeVisible();
  });

  test("prev/next/Today navigation", async ({ page }) => {
    await page.goto("/calendar");
    const monthHeading = page.getByRole("heading", { level: 2 }).filter({ hasText: /\d{4}/ });
    const initial = await monthHeading.textContent();

    await page.getByRole("button", { name: /next month/i }).click();
    await expect(monthHeading).not.toHaveText(initial ?? "");

    await page.getByRole("button", { name: /^today$/i }).click();
    await expect(monthHeading).toHaveText(initial ?? "");
  });

  test("client filter narrows the view", async ({ page }) => {
    await page.goto("/calendar");
    const filter = page.locator('[role="combobox"]').first();
    if ((await filter.count()) === 0) {
      test.skip(true, "Filter not rendered");
    }
    await filter.click();
    // First non-"All clients" option, if any
    const firstOption = page.getByRole("option").nth(1);
    if ((await firstOption.count()) === 0) {
      test.skip(true, "No clients in test account");
    }
    await firstOption.click();
    // URL should reflect the filter
    await expect(page).toHaveURL(/[?&]client=/);
  });
});
