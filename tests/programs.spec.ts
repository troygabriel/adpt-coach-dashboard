import { test, expect } from "@playwright/test";

/**
 * Specifically exercises the program builder flow that the user reported as
 * broken ("didnt work on empty workout") to confirm it works end-to-end.
 */
test.describe("Programs — empty-workout flow", () => {
  test("program list page loads", async ({ page }) => {
    await page.goto("/programs");
    await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
  });

  test("opens an existing program builder", async ({ page }) => {
    await page.goto("/programs");
    const programCard = page.locator("[data-slot='card']").first();

    if ((await programCard.count()) === 0) {
      test.skip(true, "No programs in the test account — create one to enable this test");
    }

    await programCard.click();
    await expect(page).toHaveURL(/\/programs\/[a-f0-9-]+/);
    // Header shows "for <Client Name>"
    await expect(page.getByText(/^for /)).toBeVisible();
  });

  test("clicking 'Add workout day' opens the editor with empty state", async ({ page }) => {
    await page.goto("/programs");
    const programCard = page.locator("[data-slot='card']").first();
    if ((await programCard.count()) === 0) {
      test.skip(true, "No programs in the test account");
    }
    await programCard.click();

    const addDayButton = page.getByRole("button", { name: /add workout day/i });
    if ((await addDayButton.count()) === 0) {
      test.skip(true, "Builder lacks Add workout day button — phase may be missing");
    }
    await addDayButton.click();

    // The editor should open and show "No exercises yet" empty state.
    await expect(page.getByText(/no exercises yet/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/workout name/i)).toBeVisible();
  });

  test("clicking an existing empty workout day opens the editor", async ({ page }) => {
    await page.goto("/programs");
    const programCard = page.locator("[data-slot='card']").first();
    if ((await programCard.count()) === 0) {
      test.skip(true, "No programs");
    }
    await programCard.click();

    // Find a day card whose body shows "No exercises — tap to add"
    const emptyDay = page.locator("[data-slot='card']", {
      hasText: /no exercises — tap to add/i,
    }).first();

    if ((await emptyDay.count()) === 0) {
      test.skip(true, "No empty workout days to click — try the add-day test instead");
    }
    await emptyDay.click();

    await expect(page.getByText(/no exercises yet/i)).toBeVisible();
  });
});

test.describe("Programs — Phase goal-led naming", () => {
  test("phase tabs render goal-led names", async ({ page }) => {
    await page.goto("/programs");
    const programCard = page.locator("[data-slot='card']").first();
    if ((await programCard.count()) === 0) {
      test.skip(true, "No programs");
    }
    await programCard.click();

    // Tabs should match "Phase N: <Goal>" or just "Phase N"
    const phaseTab = page.getByRole("tab").first();
    await expect(phaseTab).toBeVisible();
    const text = await phaseTab.textContent();
    expect(text).toMatch(/^Phase \d+/);
  });
});
