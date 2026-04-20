import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Column from "@/components/Column";
import { DndContext } from "@dnd-kit/core";
import { useBoardStore } from "@/store/boardStore";
import { STATUS_CONFIG, type Column as ColumnType, type Task, type TaskStatus } from "@/lib/types";

vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
  },
}));

let nextId = 0;
function task(title: string, status: TaskStatus): Task {
  return {
    id: `t${nextId++}`,
    title,
    status,
    notes: "",
    order: 0,
    createdAt: 1000,
  };
}

function makeColumn(tasks: Task[], title = "Proj"): ColumnType {
  return { id: "col-1", title, color: "#000", order: 0, tasks };
}

function renderColumn(col: ColumnType) {
  useBoardStore.setState({
    board: { id: "b", columns: [col] },
    initialized: true,
    expandedTaskId: null,
  });
  return render(
    <DndContext>
      <Column column={col} />
    </DndContext>
  );
}

describe("Column", () => {
  beforeEach(() => {
    localStorage.clear();
    nextId = 0;
  });

  it("shows only active task count in the header", () => {
    const col = makeColumn([task("A", "todo"), task("B", "queued"), task("D", "done")]);
    renderColumn(col);
    // two active tasks → the count span shows 2
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders active tasks outside the Done section", () => {
    renderColumn(makeColumn([task("Active", "todo"), task("Finished", "done")]));
    expect(screen.getByText("Active")).toBeInTheDocument();
    // Done task is hidden until toggled open
    expect(screen.queryByText("Finished")).not.toBeInTheDocument();
  });

  it("toggles the Done section", async () => {
    const user = userEvent.setup();
    renderColumn(makeColumn([task("Finished", "done")]));
    const doneToggle = screen.getByRole("button", { name: /Done \(1\)/ });
    await user.click(doneToggle);
    expect(screen.getByText("Finished")).toBeInTheDocument();
  });

  it("opens the confirm modal when deleting a project", async () => {
    const user = userEvent.setup();
    renderColumn(makeColumn([task("X", "todo")], "Deletable"));
    await user.click(screen.getByLabelText(/Deletable.* menu/));
    await user.click(screen.getByRole("button", { name: "Delete Project" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Delete "Deletable"\?/)).toBeInTheDocument();
  });

  it("progress bar segments use STATUS_CONFIG colors", () => {
    const col = makeColumn([
      task("a", "todo"),
      task("b", "queued"),
      task("c", "in-review"),
      task("d", "done"),
    ]);
    const { container } = renderColumn(col);
    // ProgressBar root: the sibling div just before the droppable area with this class signature.
    const progressRoot = container.querySelector(".flex.h-1.w-full.gap-px");
    expect(progressRoot).toBeTruthy();
    const segments = Array.from(progressRoot!.children) as HTMLElement[];
    // 4 statuses present → 4 segments rendered.
    expect(segments).toHaveLength(4);
    const colors = segments.map((seg) => seg.style.backgroundColor);
    const hexToRgb = (hex: string) => {
      const n = parseInt(hex.replace("#", ""), 16);
      return `rgb(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff})`;
    };
    const expected: TaskStatus[] = ["done", "in-review", "queued", "todo"];
    expected.forEach((status, i) => {
      expect(colors[i]).toBe(hexToRgb(STATUS_CONFIG[status].color));
    });
  });

  it("clears done tasks via modal confirmation", async () => {
    const user = userEvent.setup();
    renderColumn(makeColumn([task("A", "done"), task("B", "todo")]));
    await user.click(screen.getByLabelText(/Clear done tasks/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const confirmBtn = screen.getAllByRole("button", { name: "Clear" })[0];
    await user.click(confirmBtn);
    const col = useBoardStore.getState().board.columns[0];
    expect(col.tasks.every((t) => t.status !== "done")).toBe(true);
  });
});
