import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTask from "@/components/AddTask";
import { useBoardStore } from "@/store/boardStore";

vi.mock("@/lib/storage", () => ({
  storage: {
    loadBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("AddTask", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: {
        id: "board-1",
        columns: [
          { id: "col-1", title: "Test", color: "#000", order: 0, tasks: [] },
        ],
      },
      initialized: true,
    });
  });

  it('shows "+ Add task" button initially', () => {
    render(<AddTask columnId="col-1" />);
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("clicking reveals input form", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    expect(screen.getByPlaceholderText("Task title...")).toBeInTheDocument();
  });

  it("submitting with Enter creates task and clears input", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText("Task title...");
    await user.type(input, "New Task{Enter}");

    expect(useBoardStore.getState().board.columns[0].tasks).toHaveLength(1);
    expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe(
      "New Task"
    );
    expect(input).toHaveValue("");
  });

  it("Escape cancels and hides form", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    expect(screen.getByPlaceholderText("Task title...")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("empty blur cancels", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText("Task title...");
    await user.click(document.body);

    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("clicking Add button submits the task", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText("Task title...");
    await user.type(input, "Button Task");
    await user.click(screen.getByText("Add"));

    expect(useBoardStore.getState().board.columns[0].tasks).toHaveLength(1);
    expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe(
      "Button Task"
    );
  });
});
