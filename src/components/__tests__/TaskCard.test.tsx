import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskCard from "@/components/TaskCard";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useBoardStore } from "@/store/boardStore";
import type { Task } from "@/lib/types";

vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
  },
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "My Task",
    status: "todo",
    notes: "",
    order: 0,
    createdAt: 1000,
    ...overrides,
  };
}

function renderCard(task: Task, columnId = "col-1") {
  useBoardStore.setState({
    board: {
      id: "b",
      columns: [{ id: columnId, title: "Col", color: "#000", order: 0, tasks: [task] }],
    },
    initialized: true,
    expandedTaskId: null,
  });
  return render(
    <DndContext>
      <SortableContext items={[task.id]}>
        <TaskCard task={task} columnId={columnId} />
      </SortableContext>
    </DndContext>
  );
}

describe("TaskCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the task title", () => {
    renderCard(makeTask({ title: "Buy coffee" }));
    expect(screen.getByText("Buy coffee")).toBeInTheDocument();
  });

  it("expands to show TaskDetail on click", async () => {
    const user = userEvent.setup();
    renderCard(makeTask());
    expect(screen.queryByPlaceholderText(/What to tell the agent/)).not.toBeInTheDocument();
    await user.click(screen.getByText("My Task"));
    expect(screen.getByPlaceholderText(/What to tell the agent/)).toBeInTheDocument();
  });

  it("hides the drag handle on done tasks", () => {
    renderCard(makeTask({ status: "done" }));
    expect(screen.queryByLabelText(/Drag task/)).not.toBeInTheDocument();
  });

  it("shows the drag handle on non-done tasks", () => {
    renderCard(makeTask({ status: "queued" }));
    expect(screen.getByLabelText(/Drag task/)).toBeInTheDocument();
  });

  it("deletes the task via the delete button", async () => {
    const user = userEvent.setup();
    renderCard(makeTask({ title: "Doomed" }));
    const deleteBtn = screen.getByLabelText("Delete task: Doomed");
    await user.click(deleteBtn);
    const col = useBoardStore.getState().board.columns[0];
    expect(col.tasks).toHaveLength(0);
  });

  it("cycles status forward via next button", async () => {
    const user = userEvent.setup();
    renderCard(makeTask({ title: "Cycler", status: "todo" }));
    await user.click(screen.getByLabelText("Move task to next status: Cycler"));
    const col = useBoardStore.getState().board.columns[0];
    expect(col.tasks[0].status).toBe("queued");
  });

  it("collapses when another task becomes the expanded one", () => {
    renderCard(makeTask());
    act(() => {
      useBoardStore.getState().setExpandedTaskId("t1");
    });
    expect(screen.getByPlaceholderText(/What to tell the agent/)).toBeInTheDocument();
    act(() => {
      useBoardStore.getState().setExpandedTaskId("other");
    });
    expect(screen.queryByPlaceholderText(/What to tell the agent/)).not.toBeInTheDocument();
  });

  it("renders a link icon for each of the first 3 links", () => {
    renderCard(
      makeTask({
        links: [
          { id: "l1", url: "https://github.com/a/b" },
          { id: "l2", url: "https://company.atlassian.net/browse/X-1" },
          { id: "l3", url: "https://example.com" },
        ],
      })
    );
    expect(screen.getByLabelText("Open link: https://github.com/a/b")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Open link: https://company.atlassian.net/browse/X-1")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Open link: https://example.com")).toBeInTheDocument();
  });

  it("shows due date badge when dueDate is set", () => {
    const futureDate = new Date(2099, 5, 15, 12, 0, 0).getTime(); // June 15, 2099 at noon local
    renderCard(makeTask({ dueDate: futureDate }));
    expect(screen.getByText("Jun 15")).toBeInTheDocument();
  });

  it("does not show due date badge when dueDate is not set", () => {
    renderCard(makeTask());
    expect(
      screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
    ).not.toBeInTheDocument();
  });

  it("shows due date badge in red when task is overdue and not done", () => {
    const pastDate = new Date("2000-01-01").getTime();
    const { container } = renderCard(makeTask({ dueDate: pastDate }));
    const badge = container.querySelector(".text-red-500");
    expect(badge).toBeInTheDocument();
  });

  it("does not show red badge for overdue date when task is done", () => {
    const pastDate = new Date("2000-01-01").getTime();
    const { container } = renderCard(makeTask({ dueDate: pastDate, status: "done" }));
    expect(container.querySelector(".text-red-500")).not.toBeInTheDocument();
  });

  it('shows a "+N" overflow pill when there are more than 3 links', () => {
    renderCard(
      makeTask({
        links: [
          { id: "l1", url: "https://github.com/a/b" },
          { id: "l2", url: "https://company.atlassian.net/browse/X-1" },
          { id: "l3", url: "https://example.com" },
          { id: "l4", url: "https://slack.com/x" },
          { id: "l5", url: "https://news.ycombinator.com" },
        ],
      })
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
