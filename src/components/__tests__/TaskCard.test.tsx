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
});
