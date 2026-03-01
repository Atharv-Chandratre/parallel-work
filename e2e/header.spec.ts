import { test, expect, Page, Locator } from "@playwright/test";

async function clearBoard(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.request.put("/api/board", {
    data: { id: "test-board", columns: [] },
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function clickNextStatus(taskCard: Locator) {
  await taskCard.getByTitle("Next status").dispatchEvent("click");
}

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

  test("task counters update as tasks change status", async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);

    // Create column
    await page.getByRole("button", { name: "+ Add Project" }).first().click();
    await page.getByPlaceholder("Project name...").fill("Counter Test");
    await page.getByPlaceholder("Project name...").press("Enter");

    // Add 2 tasks
    await page.getByText("+ Add task").click();
    await page.getByPlaceholder("Task title...").fill("Task A");
    await page.getByPlaceholder("Task title...").press("Enter");
    await page.getByPlaceholder("Task title...").fill("Task B");
    await page.getByPlaceholder("Task title...").press("Enter");

    // Header counter
    const header = page.locator("header");
    await expect(header.getByText("2 to do")).toBeVisible();

    // Cycle Task A to queued
    const taskA = page.locator(".group").filter({ hasText: "Task A" });
    await clickNextStatus(taskA);

    await expect(header.getByText("1 queued")).toBeVisible();
    await expect(header.getByText("1 to do")).toBeVisible();

    // Cycle Task A to in-review
    await clickNextStatus(taskA);

    await expect(header.getByText("1 in review")).toBeVisible();
    await expect(header.getByText("1 to do")).toBeVisible();
    await expect(header.getByText(/queued/)).not.toBeVisible();
  });
});
