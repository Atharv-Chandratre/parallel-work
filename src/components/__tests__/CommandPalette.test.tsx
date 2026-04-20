import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette from "@/components/CommandPalette";
import { useBoardStore } from "@/store/boardStore";
import { useFilterStore } from "@/store/filterStore";

vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
  },
}));

function seed() {
  useBoardStore.setState({
    board: {
      id: "b1",
      name: "Board 1",
      columns: [
        { id: "c1", title: "Alpha", color: "#000", order: 0, tasks: [] },
        { id: "c2", title: "Beta", color: "#000", order: 1, tasks: [] },
      ],
    },
    boards: {},
    activeBoardId: "b1",
    initialized: true,
  });
  useFilterStore.setState({
    searchQuery: "stale query",
    statusFilters: ["done"],
    linkTypeFilters: [],
  });
}

describe("CommandPalette", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("filters commands by substring match in the input", async () => {
    const user = userEvent.setup();
    render(<CommandPalette onClose={() => {}} />);
    await user.type(screen.getByRole("textbox", { name: "Command" }), "undo");
    const list = screen.getByRole("listbox");
    const items = Array.from(list.querySelectorAll("button"));
    expect(items.some((b) => b.textContent?.toLowerCase().includes("undo"))).toBe(true);
    // "redo" does not contain "undo" and is not a subsequence of it, so it is filtered out.
    expect(items.every((b) => !b.textContent?.toLowerCase().includes("redo"))).toBe(true);
  });

  it('Enter runs the first visible command ("Clear filters" narrows to it)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);
    await user.type(screen.getByRole("textbox", { name: "Command" }), "clear filters");
    await user.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalled();
    // run() is deferred via setTimeout(0); wait for it.
    await new Promise((r) => setTimeout(r, 20));
    const f = useFilterStore.getState();
    expect(f.searchQuery).toBe("");
    expect(f.statusFilters).toEqual([]);
  });

  it("Arrow Down advances the active index", async () => {
    const user = userEvent.setup();
    render(<CommandPalette onClose={() => {}} />);
    // With no query, all commands are listed; the first is initially selected.
    const first = screen.getAllByRole("option")[0];
    expect(first.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowDown}");
    const second = screen.getAllByRole("option")[1];
    expect(second.getAttribute("aria-selected")).toBe("true");
  });

  it("Escape closes the palette", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it('includes a "Jump to:" command for each board column', () => {
    render(<CommandPalette onClose={() => {}} />);
    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.textContent ?? "");
    expect(labels.some((l) => l.includes("Jump to: Alpha"))).toBe(true);
    expect(labels.some((l) => l.includes("Jump to: Beta"))).toBe(true);
  });
});
