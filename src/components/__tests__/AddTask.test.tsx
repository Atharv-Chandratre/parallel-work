import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTask from "@/components/AddTask";
import { useBoardStore } from "@/store/boardStore";

vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
  },
}));

describe("AddTask", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: {
        id: "board-1",
        columns: [{ id: "col-1", title: "Test", color: "#000", order: 0, tasks: [] }],
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
    expect(screen.getByPlaceholderText(/Task title/)).toBeInTheDocument();
  });

  it("submitting with Enter creates task and clears input", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText(/Task title/);
    await user.type(input, "New Task{Enter}");

    expect(useBoardStore.getState().board.columns[0].tasks).toHaveLength(1);
    expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("New Task");
    expect(input).toHaveValue("");
  });

  it("Escape cancels and hides form", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    expect(screen.getByPlaceholderText(/Task title/)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("empty blur cancels", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    screen.getByPlaceholderText(/Task title/);
    await user.click(document.body);

    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("clicking Add button submits the task", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText(/Task title/);
    await user.type(input, "Button Task");
    await user.click(screen.getByText("Add"));

    expect(useBoardStore.getState().board.columns[0].tasks).toHaveLength(1);
    expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("Button Task");
  });

  it("pasting a URL creates a task with that link and auto-fills the title", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, title: "Fetched Page Title" }), { status: 200 })
      );
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText(/Task title/);
    await user.type(input, "https://example.com/page{Enter}");

    // The task was created with the URL as its first link.
    const tasks = useBoardStore.getState().board.columns[0].tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].links).toHaveLength(1);
    expect(tasks[0].links?.[0].url).toBe("https://example.com/page");

    // Let the async title fetch apply, then verify the title was replaced.
    await new Promise((r) => setTimeout(r, 30));
    expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("Fetched Page Title");
  });

  it("falls back to the URL as title if the fetch returns no title", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 404 }));
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);

    await user.click(screen.getByText("+ Add task"));
    await user.type(screen.getByPlaceholderText(/Task title/), "https://example.com/x{Enter}");

    await new Promise((r) => setTimeout(r, 30));
    // Title remains the URL — not overwritten to empty.
    expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("https://example.com/x");
  });

  it("plain text input still creates a regular task (no link)", async () => {
    const user = userEvent.setup();
    render(<AddTask columnId="col-1" />);
    await user.click(screen.getByText("+ Add task"));
    await user.type(screen.getByPlaceholderText(/Task title/), "Just some text{Enter}");
    const task = useBoardStore.getState().board.columns[0].tasks[0];
    expect(task.title).toBe("Just some text");
    expect(task.links ?? []).toHaveLength(0);
  });
});
