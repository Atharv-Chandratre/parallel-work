import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDetail from "@/components/TaskDetail";
import { useBoardStore } from "@/store/boardStore";
import { Task } from "@/lib/types";

vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
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

  it("renders existing link rows for task.links", () => {
    const taskWithLinks: Task = {
      ...baseTask,
      links: [
        { id: "l1", url: "https://github.com/owner/repo/pull/1" },
        { id: "l2", url: "https://company.atlassian.net/browse/PROJ-123" },
      ],
    };
    render(<TaskDetail task={taskWithLinks} columnId="col-1" />);
    expect(screen.getByDisplayValue("https://github.com/owner/repo/pull/1")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://company.atlassian.net/browse/PROJ-123")
    ).toBeInTheDocument();
  });

  it("adds a new link on blur of the add-link input", async () => {
    const user = userEvent.setup();
    render(<TaskDetail task={baseTask} columnId="col-1" />);
    const addInput = screen.getByPlaceholderText(/Paste GitHub/);

    await user.type(addInput, "https://jira.example.com/issue-123");
    await user.click(document.body);

    const links = useBoardStore.getState().board.columns[0].tasks[0].links ?? [];
    expect(links.map((l) => l.url)).toContain("https://jira.example.com/issue-123");
  });

  it("removes a link when its X button is clicked", async () => {
    const user = userEvent.setup();
    const taskWithLinks: Task = {
      ...baseTask,
      links: [{ id: "l1", url: "https://example.com/doomed" }],
    };
    useBoardStore.setState((s) => ({
      board: {
        ...s.board,
        columns: s.board.columns.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => (t.id === baseTask.id ? taskWithLinks : t)),
        })),
      },
    }));
    render(<TaskDetail task={taskWithLinks} columnId="col-1" />);

    await user.click(screen.getByLabelText("Remove link"));
    const links = useBoardStore.getState().board.columns[0].tasks[0].links ?? [];
    expect(links).toHaveLength(0);
  });

  describe("link auto-title", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("auto-fills the task title when adding a link to an untitled task", async () => {
      // Start with an empty-title task so the auto-fill branch triggers.
      const empty: Task = { ...baseTask, title: "" };
      useBoardStore.setState((s) => ({
        board: {
          ...s.board,
          columns: s.board.columns.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) => (t.id === baseTask.id ? empty : t)),
          })),
        },
      }));
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true, title: "Fetched Title" }), { status: 200 })
        );

      const user = userEvent.setup();
      render(<TaskDetail task={empty} columnId="col-1" />);
      await user.type(screen.getByPlaceholderText(/Paste GitHub/), "https://example.com/a");
      await user.click(document.body);

      // fetchLinkTitle resolves async — wait a tick.
      await new Promise((r) => setTimeout(r, 30));
      expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("Fetched Title");
    });

    it("does NOT overwrite a non-empty task title on link add", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true, title: "Fetched Title" }), { status: 200 })
        );
      const user = userEvent.setup();
      render(<TaskDetail task={baseTask} columnId="col-1" />);
      await user.type(screen.getByPlaceholderText(/Paste GitHub/), "https://example.com/b");
      await user.click(document.body);
      await new Promise((r) => setTimeout(r, 30));
      expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("Test Task");
    });

    it('the "Use link title as task title" button updates the title from a fetched response', async () => {
      const taskWithLink: Task = {
        ...baseTask,
        links: [{ id: "l1", url: "https://example.com/page" }],
      };
      useBoardStore.setState((s) => ({
        board: {
          ...s.board,
          columns: s.board.columns.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) => (t.id === baseTask.id ? taskWithLink : t)),
          })),
        },
      }));
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true, title: "On-Demand Title" }), { status: 200 })
        );
      const user = userEvent.setup();
      render(<TaskDetail task={taskWithLink} columnId="col-1" />);
      await user.click(screen.getByLabelText("Use link title as task title"));
      await new Promise((r) => setTimeout(r, 30));
      expect(useBoardStore.getState().board.columns[0].tasks[0].title).toBe("On-Demand Title");
    });
  });
});
