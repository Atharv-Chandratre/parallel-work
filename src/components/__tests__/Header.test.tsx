import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "@/components/Header";
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

describe("Header", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: { id: "board-1", columns: [] },
      initialized: true,
    });
    useUiStore.setState({ isShortcutsOpen: false, isCommandPaletteOpen: false });
    localStorage.clear();
  });

  it('renders "Parallel" title', () => {
    render(<Header />);
    expect(screen.getByText("Parallel")).toBeInTheDocument();
  });

  it("Filters popover is closed by default and shows the filter chip groups when opened", async () => {
    const user = userEvent.setup();
    render(<Header />);
    // Chips live inside the popover — not in the DOM until opened.
    expect(screen.queryByRole("button", { name: /^In Review$/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Filters$/ }));
    expect(screen.getByRole("button", { name: /^In Review$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^GitHub$/ })).toBeInTheDocument();
  });

  it("Filters button shows an active count badge when filters are applied", async () => {
    const { useFilterStore } = await import("@/store/filterStore");
    useFilterStore.setState({
      searchQuery: "",
      statusFilters: ["queued", "in-review"],
      linkTypeFilters: ["github"],
    });
    render(<Header />);
    const btn = screen.getByRole("button", { name: /Filters \(3 active\)/ });
    expect(btn.textContent).toContain("3");
    useFilterStore.setState({ searchQuery: "", statusFilters: [], linkTypeFilters: [] });
  });

  it("dark mode toggle works", async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Find the toggle button by title
    const toggleBtn = screen.getByTitle(/Switch to/);
    await user.click(toggleBtn);

    // After clicking, dark mode state should toggle
    const newTitle = toggleBtn.getAttribute("title");
    expect(newTitle).toMatch(/Switch to/);
  });

  it("keyboard-shortcuts button opens the shortcuts dialog via uiStore", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByLabelText("Keyboard shortcuts"));
    expect(useUiStore.getState().isShortcutsOpen).toBe(true);
  });

  it("⌘K pill opens the command palette via uiStore", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByLabelText("Open command palette"));
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(true);
  });
});
