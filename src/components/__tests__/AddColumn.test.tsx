import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddColumn from "@/components/AddColumn";
import { useBoardStore } from "@/store/boardStore";

vi.mock("@/lib/storage", () => ({
  storage: {
    loadBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("AddColumn", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: { id: "board-1", columns: [] },
      initialized: true,
    });
  });

  it('shows "+ Add Project" button initially', () => {
    render(<AddColumn />);
    expect(screen.getByText("+ Add Project")).toBeInTheDocument();
  });

  it("clicking reveals input form", async () => {
    const user = userEvent.setup();
    render(<AddColumn />);

    await user.click(screen.getByText("+ Add Project"));
    expect(
      screen.getByPlaceholderText("Project name...")
    ).toBeInTheDocument();
  });

  it("submit creates column and hides form", async () => {
    const user = userEvent.setup();
    render(<AddColumn />);

    await user.click(screen.getByText("+ Add Project"));
    const input = screen.getByPlaceholderText("Project name...");
    await user.type(input, "My Project{Enter}");

    expect(useBoardStore.getState().board.columns).toHaveLength(1);
    expect(useBoardStore.getState().board.columns[0].title).toBe("My Project");
    expect(screen.getByText("+ Add Project")).toBeInTheDocument();
  });

  it("Escape cancels", async () => {
    const user = userEvent.setup();
    render(<AddColumn />);

    await user.click(screen.getByText("+ Add Project"));
    expect(
      screen.getByPlaceholderText("Project name...")
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.getByText("+ Add Project")).toBeInTheDocument();
  });

  it("clicking Add Project button submits the column", async () => {
    const user = userEvent.setup();
    render(<AddColumn />);

    await user.click(screen.getByText("+ Add Project"));
    const input = screen.getByPlaceholderText("Project name...");
    await user.type(input, "Button Project");
    await user.click(screen.getByRole("button", { name: "Add Project" }));

    expect(useBoardStore.getState().board.columns).toHaveLength(1);
    expect(useBoardStore.getState().board.columns[0].title).toBe(
      "Button Project"
    );
  });
});
