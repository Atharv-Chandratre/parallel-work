import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import Board from "@/components/Board";
import { useBoardStore } from "@/store/boardStore";
import { useUiStore } from "@/store/uiStore";

vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
  },
}));

describe("Board", () => {
  beforeEach(() => {
    localStorage.clear();
    useBoardStore.setState({
      board: { id: "b", columns: [] },
      initialized: false,
      expandedTaskId: null,
    });
    useUiStore.setState({ isShortcutsOpen: false, isCommandPaletteOpen: false });
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

  it("pressing `?` opens the shortcuts help", () => {
    useBoardStore.setState({ initialized: true });
    render(<Board />);
    expect(useUiStore.getState().isShortcutsOpen).toBe(false);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true })
      );
    });
    expect(useUiStore.getState().isShortcutsOpen).toBe(true);
  });

  it("pressing `?` while an input is focused does NOT open shortcuts help", () => {
    useBoardStore.setState({ initialized: true });
    render(<Board />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true })
      );
    });
    expect(useUiStore.getState().isShortcutsOpen).toBe(false);
    input.remove();
  });

  it("Cmd/Ctrl+K toggles the command palette via uiStore", () => {
    useBoardStore.setState({ initialized: true });
    render(<Board />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true })
      );
    });
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(true);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true })
      );
    });
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
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
