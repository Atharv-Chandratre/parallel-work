import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import Board from "@/components/Board";
import { useBoardStore } from "@/store/boardStore";

vi.mock("@/lib/storage", () => ({
  storage: {
    loadBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardSync: vi.fn(),
  },
  STORAGE_KEY: "parallel-board",
}));

describe("Board", () => {
  beforeEach(() => {
    localStorage.clear();
    useBoardStore.setState({
      board: { id: "b", columns: [] },
      initialized: false,
      expandedTaskId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before initialization completes", () => {
    useBoardStore.setState({ initialized: false });
    render(<Board />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows the empty state when no columns exist and initialized", async () => {
    useBoardStore.setState({ initialized: true });
    render(<Board />);
    await waitFor(() => {
      expect(screen.getByText("No projects yet")).toBeInTheDocument();
    });
  });

  it("renders columns once present", () => {
    useBoardStore.setState({
      initialized: true,
      board: {
        id: "b",
        columns: [
          { id: "c1", title: "Alpha", color: "#000", order: 0, tasks: [] },
          { id: "c2", title: "Beta", color: "#000", order: 1, tasks: [] },
        ],
      },
    });
    render(<Board />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("clears expanded task on document pointerdown outside a card", () => {
    useBoardStore.setState({
      initialized: true,
      expandedTaskId: "task-x",
      board: {
        id: "b",
        columns: [{ id: "c1", title: "Alpha", color: "#000", order: 0, tasks: [] }],
      },
    });
    render(<Board />);
    expect(useBoardStore.getState().expandedTaskId).toBe("task-x");
    act(() => {
      const evt = new Event("pointerdown", { bubbles: true, cancelable: true });
      document.body.dispatchEvent(evt);
    });
    expect(useBoardStore.getState().expandedTaskId).toBeNull();
  });
});
