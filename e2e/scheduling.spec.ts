import { test, expect, Page } from "@playwright/test";

async function clearBoard(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.request.put("/api/boards", {
    data: {
      activeBoardId: "test-board",
      boards: {
        "test-board": { id: "test-board", name: "Test Board", columns: [] },
      },
    },
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function createColumn(page: Page, name: string) {
  await page.getByRole("button", { name: "+ Add Project" }).first().click();
  await page.getByPlaceholder("Project name...").fill(name);
  await page.getByPlaceholder("Project name...").press("Enter");
  await expect(page.getByRole("heading", { name }).first()).toBeVisible();
}

async function addTask(page: Page, title: string) {
  const input = page.getByPlaceholder(/Task title/);
  if (!(await input.isVisible())) await page.getByText("+ Add task").click();
  await input.fill(title);
  await input.press("Enter");
  await expect(page.locator(`span:text-is("${title}")`)).toBeVisible();
}

test.describe("View toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
  });

  test("Calendar button switches to calendar view", async ({ page }) => {
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    // Calendar view renders day-of-week headers
    await expect(page.getByText("Sun")).toBeVisible();
    await expect(page.getByText("Sat")).toBeVisible();
    // Current month/year heading is visible
    const now = new Date();
    const year = String(now.getFullYear());
    await expect(page.locator("h2").filter({ hasText: year })).toBeVisible();
  });

  test("Board button switches back to board view", async ({ page }) => {
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByText("Sun")).toBeVisible();

    await page.getByRole("button", { name: "Board", exact: true }).click();
    // Back on the board — empty state or add project button visible
    await expect(page.getByText("No projects yet")).toBeVisible();
  });
});

test.describe("Due dates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
    await createColumn(page, "Sprint");
  });

  test("setting a due date shows badge on task card", async ({ page }) => {
    await addTask(page, "Deadline Task");

    // Expand task detail
    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Deadline Task" });
    await taskSpan.click();

    // Set a far-future due date so it's never overdue in CI
    const input = page.locator('input[type="date"]');
    await expect(input).toBeVisible();
    await input.fill("2099-08-20");
    // Blur to trigger onChange
    await page.getByRole("heading", { name: "Sprint" }).first().click();

    // Badge should appear on the card
    const taskCard = page.locator(".group").filter({ hasText: "Deadline Task" });
    await expect(taskCard.getByText("Aug 20")).toBeVisible();
  });

  test("clearing a due date removes the badge", async ({ page }) => {
    await addTask(page, "Clear Badge Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Clear Badge Task" });
    await taskSpan.click();

    const input = page.locator('input[type="date"]');
    await input.fill("2099-09-15");
    await page.getByRole("heading", { name: "Sprint" }).first().click();

    const taskCard = page.locator(".group").filter({ hasText: "Clear Badge Task" });
    await expect(taskCard.getByText("Sep 15")).toBeVisible();

    // Re-expand and clear
    await taskSpan.click();
    await page.getByLabel("Clear due date").click();
    await page.getByRole("heading", { name: "Sprint" }).first().click();

    await expect(taskCard.getByText("Sep 15")).not.toBeVisible();
  });

  test("overdue task shows red badge", async ({ page }) => {
    await addTask(page, "Overdue Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Overdue Task" });
    await taskSpan.click();

    const input = page.locator('input[type="date"]');
    await input.fill("2000-01-01");
    await page.getByRole("heading", { name: "Sprint" }).first().click();

    const taskCard = page.locator(".group").filter({ hasText: "Overdue Task" });
    const badge = taskCard.locator(".text-red-500");
    await expect(badge).toBeVisible();
  });
});

test.describe("Calendar view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
    await createColumn(page, "Sprint");
  });

  test("task with due date in current month appears in calendar", async ({ page }) => {
    await addTask(page, "Calendar Task");

    // Set due date to the 15th of the current month
    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Calendar Task" });
    await taskSpan.click();

    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const dueStr = `${yyyy}-${mm}-15`;
    const input = page.locator('input[type="date"]');
    await input.fill(dueStr);
    await page.getByRole("heading", { name: "Sprint" }).first().click();

    // Switch to calendar view
    await page.getByRole("button", { name: "Calendar", exact: true }).click();

    // Task chip should appear in the calendar
    await expect(page.getByRole("button", { name: /Calendar Task/ })).toBeVisible();
  });

  test("task without due date does not appear in calendar", async ({ page }) => {
    await addTask(page, "No Date Task");
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByRole("button", { name: /No Date Task/ })).not.toBeVisible();
  });

  test("clicking a task chip in calendar switches to board view with task expanded", async ({
    page,
  }) => {
    await addTask(page, "Jump Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Jump Task" });
    await taskSpan.click();

    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    await page.locator('input[type="date"]').fill(`${yyyy}-${mm}-15`);
    await page.getByRole("heading", { name: "Sprint" }).first().click();

    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    const chip = page.getByRole("button", { name: /Jump Task/ });
    await expect(chip).toBeVisible();

    // dispatchEvent bypasses dnd-kit pointer capture (same pattern as board tests)
    await chip.dispatchEvent("click");

    // Should be back on board view with task expanded
    await expect(page.getByPlaceholder(/What to tell the agent/)).toBeVisible({ timeout: 10000 });
  });

  test("prev/next month navigation works", async ({ page }) => {
    await page.getByRole("button", { name: "Calendar", exact: true }).click();

    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const nextMonthName = monthNames[(now.getMonth() + 1) % 12];

    await page.getByLabel("Next month").click();
    await expect(page.locator("h2").filter({ hasText: nextMonthName })).toBeVisible();

    await page.getByText("Today").click();
    await expect(page.locator("h2").filter({ hasText: monthNames[now.getMonth()] })).toBeVisible();
  });
});
