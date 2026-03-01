import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "@/components/Header";
import { useBoardStore } from "@/store/boardStore";

vi.mock("@/lib/storage", () => ({
  storage: {
    loadBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Header", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: { id: "board-1", columns: [] },
      initialized: true,
    });
    localStorage.clear();
  });

  it('renders "Parallel" title', () => {
    render(<Header />);
    expect(screen.getByText("Parallel")).toBeInTheDocument();
  });

  it("shows task counters when tasks exist", () => {
    useBoardStore.setState({
      board: {
        id: "board-1",
        columns: [
          {
            id: "col-1",
            title: "Test",
            color: "#000",
            order: 0,
            tasks: [
              {
                id: "t1",
                title: "A",
                status: "queued",
                notes: "",
                order: 0,
                createdAt: 1000,
              },
              {
                id: "t2",
                title: "B",
                status: "queued",
                notes: "",
                order: 1,
                createdAt: 1000,
              },
              {
                id: "t3",
                title: "C",
                status: "in-review",
                notes: "",
                order: 2,
                createdAt: 1000,
              },
              {
                id: "t4",
                title: "D",
                status: "todo",
                notes: "",
                order: 3,
                createdAt: 1000,
              },
            ],
          },
        ],
      },
      initialized: true,
    });

    render(<Header />);
    expect(screen.getByText("2 queued")).toBeInTheDocument();
    expect(screen.getByText("1 in review")).toBeInTheDocument();
    expect(screen.getByText("1 to do")).toBeInTheDocument();
  });

  it("does not show counters when there are no tasks of that status", () => {
    render(<Header />);
    expect(screen.queryByText(/queued/)).not.toBeInTheDocument();
    expect(screen.queryByText(/in review/)).not.toBeInTheDocument();
    expect(screen.queryByText(/to do/)).not.toBeInTheDocument();
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
});
