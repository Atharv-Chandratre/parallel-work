import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDetail from "@/components/TaskDetail";
import { useBoardStore } from "@/store/boardStore";
import { Task } from "@/lib/types";

vi.mock("@/lib/storage", () => ({
  storage: {
    loadBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn().mockResolvedValue(undefined),
  },
}));

const baseTask: Task = {
  id: "task-1",
  title: "Test Task",
  status: "todo",
  notes: "Some notes here",
  order: 0,
  createdAt: new Date("2025-01-15T10:30:00").getTime(),
};

describe("TaskDetail", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: {
        id: "board-1",
        columns: [
          {
            id: "col-1",
            title: "Test",
            color: "#000",
            order: 0,
            tasks: [baseTask],
          },
        ],
      },
      initialized: true,
    });
  });

  it("renders notes textarea with current value", () => {
    render(<TaskDetail task={baseTask} columnId="col-1" />);
    const textarea = screen.getByPlaceholderText(/What to tell the agent/) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Some notes here");
  });

  it("saves notes on blur", async () => {
    const user = userEvent.setup();
    render(<TaskDetail task={baseTask} columnId="col-1" />);
    const textarea = screen.getByPlaceholderText(/What to tell the agent/);

    await user.clear(textarea);
    await user.type(textarea, "Updated notes");
    await user.click(document.body);

    expect(useBoardStore.getState().board.columns[0].tasks[0].notes).toBe("Updated notes");
  });

  it("shows created timestamp", () => {
    render(<TaskDetail task={baseTask} columnId="col-1" />);
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
  });

  it("shows started timestamp when present", () => {
    const taskWithStart: Task = {
      ...baseTask,
      status: "in-review",
      startedAt: new Date("2025-01-16T14:00:00").getTime(),
    };
    render(<TaskDetail task={taskWithStart} columnId="col-1" />);
    // Both created and started dates should be visible
    const dateElements = screen.getAllByText(/Jan 1[56]/);
    expect(dateElements.length).toBeGreaterThanOrEqual(2);
  });

  it("shows completed timestamp when present", () => {
    const taskWithComplete: Task = {
      ...baseTask,
      status: "done",
      completedAt: new Date("2025-01-17T09:00:00").getTime(),
    };
    render(<TaskDetail task={taskWithComplete} columnId="col-1" />);
    const dateElements = screen.getAllByText(/Jan 1[57]/);
    expect(dateElements.length).toBeGreaterThanOrEqual(2);
  });
});
