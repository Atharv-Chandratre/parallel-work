import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "@/components/CalendarView";
import { useBoardStore } from "@/store/boardStore";
import { useUiStore } from "@/store/uiStore";
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
    title: "Test Task",
    status: "todo",
    notes: "",
    order: 0,
    createdAt: 1000,
    ...overrides,
  };
}

function setupStore(tasks: Task[]) {
  useBoardStore.setState({
    board: {
      id: "b",
      columns: [{ id: "col-1", title: "Sprint", color: "#3b82f6", order: 0, tasks }],
    },
    initialized: true,
    expandedTaskId: null,
  });
  useUiStore.setState({ viewMode: "calendar" });
}

describe("CalendarView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the current month name and year", () => {
    setupStore([]);
    render(<CalendarView />);
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
    expect(screen.getByText(new RegExp(monthNames[now.getMonth()]))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(String(now.getFullYear())))).toBeInTheDocument();
  });

  it("shows day-of-week headers", () => {
    setupStore([]);
    render(<CalendarView />);
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  it("shows a task on its due date", () => {
    const now = new Date();
    const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), 15).getTime();
    setupStore([makeTask({ title: "Due This Month", dueDate: thisMonthDue })]);
    render(<CalendarView />);
    expect(screen.getByText("Due This Month")).toBeInTheDocument();
  });

  it("does not show tasks without a dueDate", () => {
    setupStore([makeTask({ title: "No Due Date Task" })]);
    render(<CalendarView />);
    expect(screen.queryByText("No Due Date Task")).not.toBeInTheDocument();
  });

  it("navigates to next month on arrow click", async () => {
    const user = userEvent.setup();
    setupStore([]);
    render(<CalendarView />);
    const now = new Date();
    const nextMonthIdx = (now.getMonth() + 1) % 12;
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
    await user.click(screen.getByLabelText("Next month"));
    expect(screen.getByText(new RegExp(monthNames[nextMonthIdx]))).toBeInTheDocument();
  });

  it("navigates back to current month on Today button click", async () => {
    const user = userEvent.setup();
    setupStore([]);
    render(<CalendarView />);
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
    // Go forward 2 months
    await user.click(screen.getByLabelText("Next month"));
    await user.click(screen.getByLabelText("Next month"));
    // Click Today
    await user.click(screen.getByText("Today"));
    expect(screen.getByText(new RegExp(monthNames[now.getMonth()]))).toBeInTheDocument();
  });

  it("switches to board view and sets expandedTaskId when a task chip is clicked", async () => {
    const user = userEvent.setup();
    const now = new Date();
    const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), 15).getTime();
    setupStore([makeTask({ id: "task-abc", title: "Clickable Task", dueDate: thisMonthDue })]);
    render(<CalendarView />);
    await user.click(screen.getByText("Clickable Task"));
    expect(useBoardStore.getState().expandedTaskId).toBe("task-abc");
    expect(useUiStore.getState().viewMode).toBe("board");
  });
});
