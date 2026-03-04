import { test, expect, Page, Locator } from "@playwright/test";

// Clear board state before each test
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

async function createColumn(page: Page, name: string) {
  await page.getByRole("button", { name: "+ Add Project" }).first().click();
  await page.getByPlaceholder("Project name...").fill(name);
  await page.getByPlaceholder("Project name...").press("Enter");
  await expect(page.getByRole("heading", { name }).first()).toBeVisible();
}

async function addTask(page: Page, title: string) {
  const input = page.getByPlaceholder("Task title...");
  // If the add-task form is already open, use it directly; otherwise click to open
  if (!(await input.isVisible())) {
    await page.getByText("+ Add task").click();
  }
  await input.fill(title);
  await input.press("Enter");
  await expect(page.locator(`span:text-is("${title}")`)).toBeVisible();
}

// Use dispatchEvent for opacity-0 buttons to reliably trigger React handlers
async function clickNextStatus(taskCard: Locator) {
  await taskCard.getByTitle("Next status").dispatchEvent("click");
}

async function clickPrevStatus(taskCard: Locator) {
  await taskCard.getByTitle("Previous status").dispatchEvent("click");
}

test.describe("Empty state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
  });

  test('shows empty state with "No projects yet"', async ({ page }) => {
    await expect(page.getByText("No projects yet")).toBeVisible();
  });

  test('shows "Add Project" button', async ({ page }) => {
    await expect(page.getByRole("button", { name: "+ Add Project" })).toBeVisible();
  });
});

test.describe("Column management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
  });

  test("create a new project column", async ({ page }) => {
    await createColumn(page, "My Project");
    await expect(page.getByText("No projects yet")).not.toBeVisible();
  });

  test("rename a column via double-click", async ({ page }) => {
    await createColumn(page, "Old Name");

    await page.getByRole("heading", { name: "Old Name" }).dblclick();
    const input = page.getByPlaceholder("Project name...");
    await input.clear();
    await input.fill("New Name");
    await input.press("Enter");

    await expect(page.getByRole("heading", { name: "New Name" })).toBeVisible();
  });

  test("delete a column via menu with confirmation modal", async ({ page }) => {
    await createColumn(page, "To Delete");

    // Click the 3-dot column menu button
    const columnHeader = page.locator('[style*="border-top"]');
    await columnHeader.locator("button").first().click();

    // Click Delete Project in menu
    await page.locator("div.absolute button").filter({ hasText: "Delete Project" }).click();

    // Modal should appear
    await expect(page.getByText('Delete "To Delete"?')).toBeVisible();
    await expect(
      page.getByText("This will permanently delete the project and all its tasks.")
    ).toBeVisible();

    // Confirm deletion via the modal's Delete button
    await page
      .getByTestId("confirm-modal-backdrop")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText("No projects yet")).toBeVisible();
  });

  test("cancel delete column via modal", async ({ page }) => {
    await createColumn(page, "Keep Me");

    const columnHeader = page.locator('[style*="border-top"]');
    await columnHeader.locator("button").first().click();
    await page.locator("div.absolute button").filter({ hasText: "Delete Project" }).click();

    // Modal should appear
    await expect(page.getByText('Delete "Keep Me"?')).toBeVisible();

    // Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Column should still exist
    await expect(page.getByRole("heading", { name: "Keep Me" })).toBeVisible();
  });
});

test.describe("Task management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
    await createColumn(page, "Test Project");
  });

  test("add a task to a column", async ({ page }) => {
    await addTask(page, "My Task");
    await expect(page.getByTitle("Status: To Do")).toBeVisible();
  });

  test("cycle task status forward (todo → queued → in-review → done)", async ({ page }) => {
    await addTask(page, "Cycle Task");

    const taskCard = page.locator(".group").filter({ hasText: "Cycle Task" });

    // todo → queued
    await clickNextStatus(taskCard);
    await expect(taskCard.getByTitle("Status: Queued")).toBeVisible();

    // queued → in-review
    await clickNextStatus(taskCard);
    await expect(taskCard.getByTitle("Status: In Review")).toBeVisible();

    // in-review → done (task moves to done section)
    await clickNextStatus(taskCard);
    const doneBtn = page.locator("button").filter({ hasText: /Done \(\d+\)/ });
    await expect(doneBtn).toBeVisible();
  });

  test("cycle task status backward", async ({ page }) => {
    await addTask(page, "Back Task");

    const taskCard = page.locator(".group").filter({ hasText: "Back Task" });

    // todo → queued
    await clickNextStatus(taskCard);
    await expect(taskCard.getByTitle("Status: Queued")).toBeVisible();

    // queued → todo
    await clickPrevStatus(taskCard);
    await expect(taskCard.getByTitle("Status: To Do")).toBeVisible();
  });

  test("delete a task", async ({ page }) => {
    await addTask(page, "Delete Me");

    const taskCard = page.locator(".group").filter({ hasText: "Delete Me" });
    // dispatchEvent to click the opacity-0 delete button
    await taskCard.getByTitle("Delete task").dispatchEvent("click");

    await expect(taskCard).toHaveCount(0);
  });

  test("inline rename a task via double-click", async ({ page }) => {
    await addTask(page, "Old Task");

    // The DnD context's PointerSensor can interfere with native dblclick.
    // Dispatch the dblclick event directly on the task title span via JS.
    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Old Task" });
    await taskSpan.dispatchEvent("dblclick");

    // After dblclick, the span is replaced by a rename input
    const renameInput = page.locator(".group input").first();
    await expect(renameInput).toBeVisible({ timeout: 5000 });
    await renameInput.fill("New Task Name");
    await renameInput.press("Enter");

    await expect(page.getByText("New Task Name")).toBeVisible();
  });

  test("expand task detail and add notes", async ({ page }) => {
    await addTask(page, "Notes Task");

    // Click the task title to expand
    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Notes Task" });
    await taskSpan.click();

    const textarea = page.getByPlaceholder(/What to tell the agent/);
    await expect(textarea).toBeVisible();
    await textarea.fill("These are my notes");
    // Click the column heading to blur
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    // Collapse and re-expand
    await taskSpan.click();
    await taskSpan.click();
    await expect(page.getByPlaceholder(/What to tell the agent/)).toHaveValue("These are my notes");
  });

  test("expand task detail and add link", async ({ page }) => {
    await addTask(page, "Link Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Link Task" });
    await taskSpan.click();

    const linkInput = page.getByPlaceholder(/Paste link/);
    await expect(linkInput).toBeVisible();
    await linkInput.fill("https://example.com/relevant-doc");
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    await taskSpan.click();
    await taskSpan.click();
    await expect(linkInput).toHaveValue("https://example.com/relevant-doc");
  });

  test("link icon appears on card for GitHub URL", async ({ page }) => {
    await addTask(page, "GitHub Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "GitHub Task" });
    await taskSpan.click();

    const linkInput = page.getByPlaceholder(/Paste link/);
    await linkInput.fill("https://github.com/owner/repo");
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    const taskCard = page.locator(".group").filter({ hasText: "GitHub Task" });
    const link = taskCard.locator('a[href="https://github.com/owner/repo"]');
    await expect(link).toBeVisible();
  });

  test("link icon appears on card for decision-systems URL", async ({ page }) => {
    await addTask(page, "Experiment Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Experiment Task" });
    await taskSpan.click();

    const linkInput = page.getByPlaceholder(/Paste link/);
    await linkInput.fill(
      "https://ops.doordash.team/decision-systems/dynamic-values-v2/experiments/67b12aa0-6e5e-4985-be2b-cbda5ada8fa2"
    );
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    const taskCard = page.locator(".group").filter({ hasText: "Experiment Task" });
    const link = taskCard.locator(
      'a[href="https://ops.doordash.team/decision-systems/dynamic-values-v2/experiments/67b12aa0-6e5e-4985-be2b-cbda5ada8fa2"]'
    );
    await expect(link).toBeVisible();
  });
});

test.describe("Done tasks section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearBoard(page);
    await createColumn(page, "Test Project");
  });

  async function cycleTaskToDone(page: Page, taskName: string) {
    const card = page.locator(".group").filter({ hasText: taskName });
    await clickNextStatus(card); // todo → queued
    await clickNextStatus(card); // queued → in-review
    await clickNextStatus(card); // in-review → done
  }

  test("done tasks appear in collapsible section", async ({ page }) => {
    await addTask(page, "Done Task");
    await cycleTaskToDone(page, "Done Task");

    const doneBtn = page.locator("button").filter({ hasText: /Done \(\d+\)/ });
    await expect(doneBtn).toBeVisible();
  });

  test("expanding/collapsing done section works", async ({ page }) => {
    await addTask(page, "Toggle Task");
    await cycleTaskToDone(page, "Toggle Task");

    const doneBtn = page.locator("button").filter({ hasText: /Done \(\d+\)/ });
    await expect(doneBtn).toBeVisible();

    // Expand - use dispatchEvent since DnD context may intercept regular clicks
    await doneBtn.dispatchEvent("click");
    await page.waitForTimeout(200);
    const taskTitle = page.getByText("Toggle Task");
    await expect(taskTitle).toBeVisible({ timeout: 5000 });

    // Collapse
    await doneBtn.dispatchEvent("click");
    await page.waitForTimeout(200);
    await expect(taskTitle).not.toBeVisible();
  });

  test("clear done tasks via inline button with confirmation modal", async ({ page }) => {
    await addTask(page, "Active Task");
    await addTask(page, "Finished Task");
    await cycleTaskToDone(page, "Finished Task");

    // Click the Clear button next to the Done toggle (use dispatchEvent for DnD context)
    await page.getByTitle("Clear done tasks").dispatchEvent("click");

    // Modal should appear
    await expect(page.getByText("Clear done tasks?")).toBeVisible();
    await expect(
      page.getByText(/This will permanently delete 1 completed task from/)
    ).toBeVisible();

    // Confirm via the modal's Clear button
    await page.getByTestId("confirm-modal-backdrop").getByRole("button", { name: "Clear" }).click();

    // Done section should disappear, active task remains
    await expect(page.locator("button").filter({ hasText: /Done \(\d+\)/ })).not.toBeVisible();
    await expect(page.getByText("Active Task")).toBeVisible();
  });

  test("cancel clear done tasks keeps tasks intact", async ({ page }) => {
    await addTask(page, "Done Task");
    await cycleTaskToDone(page, "Done Task");

    // Click the Clear button next to the Done toggle (use dispatchEvent for DnD context)
    await page.getByTitle("Clear done tasks").dispatchEvent("click");

    // Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Done section should still be there
    const doneBtn = page.locator("button").filter({ hasText: /Done \(\d+\)/ });
    await expect(doneBtn).toBeVisible();
  });
});
