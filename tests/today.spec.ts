import { test, expect } from "@playwright/test";

test.describe("Today (dashboard home)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders header + StatLine", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /good (morning|afternoon|evening)/i })).toBeVisible();
    // StatLine renders a single sentence with a · separator. Either the live
    // stat or the empty-state CTA must be present.
    const statLine = page.getByText(/active|trained this week|programs ending soon/);
    const emptyState = page.getByRole("heading", { name: /no clients yet/i });
    await expect(statLine.or(emptyState)).toBeVisible();
  });

  test("Add client CTA is present", async ({ page }) => {
    await expect(page.getByRole("link", { name: /add client/i }).or(
      page.getByRole("button", { name: /add client/i })
    )).toBeVisible();
  });

  test("Needs Attention buckets render or empty-state shows", async ({ page }) => {
    const buckets = page.getByText(
      /need new programs|phases ending soon|not training|not messaged/i
    );
    const allOnTrack = page.getByText(/all clients on track/i);
    const noClients = page.getByRole("heading", { name: /no clients yet/i });
    await expect(buckets.first().or(allOnTrack).or(noClients)).toBeVisible();
  });
});
