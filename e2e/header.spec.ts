import { test, expect } from "@playwright/test";

test.describe("Header features", () => {
  test("dark mode toggle switches theme", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    await page.getByTitle(/Switch to light mode/).click();
    await expect(html).not.toHaveClass(/dark/);

    await page.getByTitle(/Switch to dark mode/).click();
    await expect(html).toHaveClass(/dark/);
  });
});
