import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardPicker from "@/components/BoardPicker";
import { useBoardStore } from "@/store/boardStore";

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
    board: { id: "alpha", name: "Alpha", columns: [] },
    boards: {
      alpha: { id: "alpha", name: "Alpha", columns: [] },
      beta: { id: "beta", name: "Beta", columns: [] },
    },
    activeBoardId: "alpha",
    initialized: true,
    expandedTaskId: null,
  });
}

describe("BoardPicker", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("shows the active board name on the toggle button", () => {
    render(<BoardPicker />);
    expect(screen.getByRole("button", { name: /Alpha/ })).toBeInTheDocument();
  });

  it("lists all boards when opened", async () => {
    const user = userEvent.setup();
    render(<BoardPicker />);
    await user.click(screen.getByRole("button", { name: /Alpha/ }));
    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(menu.textContent).toContain("Alpha");
    expect(menu.textContent).toContain("Beta");
  });

  it("clicking a board in the list switches to it", async () => {
    const user = userEvent.setup();
    render(<BoardPicker />);
    await user.click(screen.getByRole("button", { name: /Alpha/ }));
    const menu = screen.getByRole("menu");
    const switchBtn = Array.from(menu.querySelectorAll("button")).find(
      (b) => b.textContent === "Beta"
    );
    await user.click(switchBtn!);
    expect(useBoardStore.getState().activeBoardId).toBe("beta");
  });

  it("New board uses window.prompt and creates + switches", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Gamma");
    render(<BoardPicker />);
    await user.click(screen.getByRole("button", { name: /Alpha/ }));
    await user.click(screen.getByRole("button", { name: "New board" }));
    expect(promptSpy).toHaveBeenCalled();
    const s = useBoardStore.getState();
    expect(s.board.name).toBe("Gamma");
    expect(Object.values(s.boards).some((b) => b.name === "Gamma")).toBe(true);
  });

  it("Delete prompts confirm and removes the board", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BoardPicker />);
    await user.click(screen.getByRole("button", { name: /Alpha/ }));
    await user.click(screen.getByLabelText("Delete board Beta"));
    expect(useBoardStore.getState().boards["beta"]).toBeUndefined();
  });
});
