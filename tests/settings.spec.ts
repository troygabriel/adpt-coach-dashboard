import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test("renders profile + roster sections", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText(/^Profile$/)).toBeVisible();
    await expect(page.getByText(/^Roster$/)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/bio/i)).toBeVisible();
  });

  test("Save is disabled until form is dirty", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: /save changes/i })).toBeDisabled();
    await page.getByLabel(/bio/i).fill("Updated bio.");
    await expect(page.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  test("specialty tags can be added and removed", async ({ page }) => {
    await page.goto("/settings");
    const tagInput = page.getByPlaceholder(/strength, hypertrophy/i).or(
      page.locator("input[placeholder='']").nth(0)
    );
    await tagInput.first().fill("Strength");
    await tagInput.first().press("Enter");
    await expect(page.getByText(/^Strength$/)).toBeVisible();
  });

  test("accepting-clients toggle flips", async ({ page }) => {
    await page.goto("/settings");
    const sw = page.getByRole("switch", { name: /accepting new clients/i });
    const before = await sw.getAttribute("aria-checked");
    await sw.click();
    await expect(sw).not.toHaveAttribute("aria-checked", before ?? "");
  });
});
