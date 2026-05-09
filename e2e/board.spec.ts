import { test, expect, Page, Locator } from "@playwright/test";

// Clear board state before each test
async function clearBoard(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
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

  test("hide a project column via menu and unhide from the hidden panel", async ({ page }) => {
    await createColumn(page, "Keep Visible");
    await createColumn(page, "To Hide");

    // Open the 3-dot menu for "To Hide" — pick the second column header.
    const columnHeaders = page.locator('[style*="border-top"]');
    await columnHeaders.nth(1).locator("button").first().click();
    await page.locator("div.absolute button").filter({ hasText: "Hide Project" }).click();

    // Column heading disappears from the board; Hidden panel surfaces.
    await expect(page.getByRole("heading", { name: "To Hide" })).not.toBeVisible();
    const hiddenToggle = page.getByRole("button", { name: /Hidden projects \(1\)/ });
    await expect(hiddenToggle).toBeVisible();

    // Unhide it.
    await hiddenToggle.click();
    await page.getByLabel("Unhide project To Hide").click();

    // Back on the board, panel gone.
    await expect(page.getByRole("heading", { name: "To Hide" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hidden projects/ })).not.toBeVisible();
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
    // Click the column heading — blurs input and (per outside-click behavior) collapses
    await page.getByRole("heading", { name: "Test Project" }).first().click();
    await expect(page.getByPlaceholder(/What to tell the agent/)).toHaveCount(0);

    // Re-expand to confirm notes persisted
    await taskSpan.click();
    await expect(page.getByPlaceholder(/What to tell the agent/)).toHaveValue("These are my notes");
  });

  test("expand task detail and add link", async ({ page }) => {
    await addTask(page, "Link Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Link Task" });
    await taskSpan.click();

    const addLinkInput = page.getByPlaceholder(/Paste GitHub/);
    await expect(addLinkInput).toBeVisible();
    await addLinkInput.fill("https://example.com/relevant-doc");
    await page.getByRole("heading", { name: "Test Project" }).first().click();
    await expect(page.getByPlaceholder(/Paste GitHub/)).toHaveCount(0);

    await taskSpan.click();
    await expect(page.locator('input[value="https://example.com/relevant-doc"]')).toBeVisible();
  });

  test("only one task can be expanded at a time", async ({ page }) => {
    await addTask(page, "Task A");
    await addTask(page, "Task B");

    const spanA = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Task A" });
    const spanB = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Task B" });
    const cardA = page.locator(".group").filter({ hasText: "Task A" });
    const cardB = page.locator(".group").filter({ hasText: "Task B" });

    await spanA.click();
    await expect(cardA.getByPlaceholder(/What to tell the agent/)).toBeVisible();

    await spanB.click();
    await expect(cardB.getByPlaceholder(/What to tell the agent/)).toBeVisible();
    await expect(cardA.getByPlaceholder(/What to tell the agent/)).toHaveCount(0);
  });

  test("create a second board via board picker and switch between them", async ({ page }) => {
    await addTask(page, "Task in first board");

    // Open board picker (activeBoardId is "test-board" after clearBoard, name "Test Board")
    await page.getByRole("button", { name: /Test Board/ }).click();

    // Click New board. Prompt → accept with a name.
    page.once("dialog", (d) => d.accept("Second Board"));
    await page.getByRole("button", { name: "New board" }).click();

    // The new board is now active; the task from the first board should be gone.
    await expect(page.getByText("Task in first board")).not.toBeVisible();
    // Picker label should show the new name.
    await expect(page.getByRole("button", { name: /Second Board/ })).toBeVisible();

    // Switch back to the original.
    await page.getByRole("button", { name: /Second Board/ }).click();
    await page.getByRole("button", { name: /^Test Board$/ }).click();
    await expect(page.getByText("Task in first board")).toBeVisible();
  });

  test("hide and unhide a board via the board picker", async ({ page }) => {
    // Start with the default "Test Board" active, then create a second board.
    await page.getByRole("button", { name: /Test Board/ }).click();
    page.once("dialog", (d) => d.accept("Second Board"));
    await page.getByRole("button", { name: "New board" }).click();

    // Second Board is now active. Open the picker — both should be listed.
    await page.getByRole("button", { name: /Second Board/ }).click();
    await expect(page.getByRole("button", { name: /^Test Board$/ })).toBeVisible();

    // Hide the (non-active) Test Board. Button is opacity-0 until hover,
    // so dispatch the click directly like other tests in this file.
    await page.getByLabel("Hide board Test Board").dispatchEvent("click");

    // Test Board should leave the main list and surface the Hidden section.
    await expect(page.getByRole("button", { name: /^Test Board$/ })).not.toBeVisible();
    const hiddenToggle = page.getByRole("button", { name: /Hidden \(1\)/ });
    await expect(hiddenToggle).toBeVisible();

    // Expand the Hidden section and unhide the board.
    await hiddenToggle.click();
    await page.getByLabel("Unhide board Test Board").dispatchEvent("click");

    // Test Board is visible again; switching back works.
    await page.getByRole("button", { name: /^Test Board$/ }).click();
    await expect(page.getByRole("button", { name: /^Test Board$/ })).toBeVisible();
  });

  test("command palette opens via Cmd+K and runs a command", async ({ page }) => {
    await addTask(page, "Hello");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);

    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();

    // Run "Clear filters" via typing + Enter
    await palette.getByRole("textbox", { name: "Command" }).fill("clear filters");
    await page.keyboard.press("Enter");

    // Palette should close
    await expect(palette).not.toBeVisible();
  });

  test("`?` opens the shortcuts help dialog; Esc closes it", async ({ page }) => {
    // Make sure focus is not on an input (clearBoard leaves focus somewhere benign).
    await page.getByRole("heading", { name: "Test Project" }).first().click();
    await page.keyboard.press("Shift+Slash"); // produces "?" on US layouts

    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();

    // A shortcut entry is rendered (e.g. global heading).
    await expect(dialog.getByText("Global")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("the visible ⌘K header pill opens the command palette", async ({ page }) => {
    await page.getByLabel("Open command palette").first().click();
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  });

  test('the palette\'s "Keyboard shortcuts" command opens the help dialog', async ({ page }) => {
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await palette.getByRole("textbox", { name: "Command" }).fill("keyboard shortcuts");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  });

  test("pasting a URL into Add task creates a task with that link", async ({ page }) => {
    // Stub the title-fetch API so the test is hermetic (no real network).
    await page.route("**/api/link-title*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, title: "Stubbed Page Title" }),
      })
    );

    const input = page.getByPlaceholder(/Task title/);
    await page.getByText("+ Add task").click();
    await input.fill("https://example.com/some-page");
    await input.press("Enter");

    // Title eventually becomes the fetched page title.
    await expect(page.getByText("Stubbed Page Title")).toBeVisible();

    // The card has a link icon that points to the URL we pasted.
    const card = page.locator(".group").filter({ hasText: "Stubbed Page Title" });
    await expect(card.locator('a[href="https://example.com/some-page"]')).toBeVisible();
  });

  test("pasting a GitHub PR URL sets the task title to the PR title (no URL/suffix)", async ({
    page,
  }) => {
    // Server-side route strips the "· Pull Request #N · OWNER/REPO" suffix
    // from GitHub og:title before responding. Stub that cleaned response here.
    const prUrl = "https://github.com/Atharv-Chandratre/parallel-work/pull/1";
    const cleanTitle = "Add task scheduling: due dates + calendar view";
    await page.route("**/api/link-title*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, title: cleanTitle }),
      })
    );

    const input = page.getByPlaceholder(/Task title/);
    await page.getByText("+ Add task").click();
    await input.fill(prUrl);
    await input.press("Enter");

    await expect(page.getByText(cleanTitle)).toBeVisible();
    // The raw URL should not appear as the visible task title.
    await expect(page.locator(`span:text-is("${prUrl}")`)).toHaveCount(0);

    const card = page.locator(".group").filter({ hasText: cleanTitle });
    await expect(card.locator(`a[href="${prUrl}"]`)).toBeVisible();
  });

  test("header search filters tasks across columns", async ({ page }) => {
    await addTask(page, "Buy coffee");
    await addTask(page, "Write report");

    const search = page.getByRole("searchbox", { name: /Search tasks/i });
    await search.fill("coffee");

    await expect(page.getByText("Buy coffee")).toBeVisible();
    await expect(page.getByText("Write report")).not.toBeVisible();

    await search.fill("");
    await expect(page.getByText("Write report")).toBeVisible();
  });

  test("status filter chip narrows visible tasks; Clear resets", async ({ page }) => {
    await addTask(page, "Only Task");

    // Open the Filters popover and click the "In Review" chip.
    await page.getByRole("button", { name: /^Filters$/ }).click();
    await page.getByRole("button", { name: /^In Review$/ }).click();
    await expect(page.getByText("Only Task")).not.toBeVisible();

    // Clear filters inside the popover restores the task.
    await page.getByRole("button", { name: /Clear all filters/i }).click();
    await expect(page.getByText("Only Task")).toBeVisible();
  });

  test("undo and redo via keyboard shortcuts (Cmd+Z / Shift+Cmd+Z)", async ({ page }) => {
    await addTask(page, "Undoable Task");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";

    // Click on the board body to move focus away from the (input) add-task field,
    // otherwise Cmd+Z is intercepted as a native input undo per the Board.tsx guard.
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    await page.keyboard.press(`${modifier}+z`);
    await expect(page.getByText("Undoable Task")).not.toBeVisible();

    await page.keyboard.press(`Shift+${modifier}+z`);
    await expect(page.getByText("Undoable Task")).toBeVisible();
  });

  test("clicking outside an expanded task collapses it", async ({ page }) => {
    await addTask(page, "Outside Click Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Outside Click Task" });
    await taskSpan.click();
    await expect(page.getByPlaceholder(/What to tell the agent/)).toBeVisible();

    // Click on column heading — empty area outside any task card
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    await expect(page.getByPlaceholder(/What to tell the agent/)).toHaveCount(0);
  });

  test("link icon appears on card for GitHub URL", async ({ page }) => {
    await addTask(page, "GitHub Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "GitHub Task" });
    await taskSpan.click();

    const linkInput = page.getByPlaceholder(/Paste GitHub/);
    await linkInput.fill("https://github.com/owner/repo");
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    const taskCard = page.locator(".group").filter({ hasText: "GitHub Task" });
    const link = taskCard.locator('a[href="https://github.com/owner/repo"]');
    await expect(link).toBeVisible();
  });

  test("link icon appears on card for Jira URL", async ({ page }) => {
    await addTask(page, "Jira Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Jira Task" });
    await taskSpan.click();

    const linkInput = page.getByPlaceholder(/Paste GitHub/);
    await linkInput.fill("https://mycompany.atlassian.net/browse/PROJ-123");
    await page.getByRole("heading", { name: "Test Project" }).first().click();

    const taskCard = page.locator(".group").filter({ hasText: "Jira Task" });
    const link = taskCard.locator('a[href="https://mycompany.atlassian.net/browse/PROJ-123"]');
    await expect(link).toBeVisible();
  });

  test("link icon appears on card for decision-systems URL", async ({ page }) => {
    await addTask(page, "Experiment Task");

    const taskSpan = page
      .locator('span[title="Double-click to rename"]')
      .filter({ hasText: "Experiment Task" });
    await taskSpan.click();

    const linkInput = page.getByPlaceholder(/Paste GitHub/);
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
