import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBoardStore } from "@/store/boardStore";
import { Board, COLUMN_COLORS } from "@/lib/types";

vi.mock("@/lib/storage", () => ({
  storage: {
    loadBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("nanoid", () => {
  let counter = 0;
  return {
    nanoid: () => `test-id-${counter++}`,
  };
});

function getState() {
  return useBoardStore.getState();
}

describe("boardStore", () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: { id: "board-1", columns: [] },
      initialized: false,
    });
  });

  describe("Column operations", () => {
    it("addColumn creates column with auto-color cycling and correct order", () => {
      getState().addColumn("Project A");
      expect(getState().board.columns).toHaveLength(1);
      const col = getState().board.columns[0];
      expect(col.title).toBe("Project A");
      expect(col.color).toBe(COLUMN_COLORS[0]);
      expect(col.order).toBe(0);
      expect(col.tasks).toEqual([]);

      getState().addColumn("Project B");
      expect(getState().board.columns).toHaveLength(2);
      expect(getState().board.columns[1].color).toBe(COLUMN_COLORS[1]);
      expect(getState().board.columns[1].order).toBe(1);
    });

    it("addColumn cycles colors after exhausting palette", () => {
      for (let i = 0; i < COLUMN_COLORS.length + 1; i++) {
        getState().addColumn(`Col ${i}`);
      }
      const lastCol = getState().board.columns[COLUMN_COLORS.length];
      expect(lastCol.color).toBe(COLUMN_COLORS[0]);
    });

    it("renameColumn updates title for matching column only", () => {
      getState().addColumn("Old Name");
      getState().addColumn("Other");
      const colId = getState().board.columns[0].id;

      getState().renameColumn(colId, "New Name");
      expect(getState().board.columns[0].title).toBe("New Name");
      expect(getState().board.columns[1].title).toBe("Other");
    });

    it("deleteColumn removes column and re-indexes orders", () => {
      getState().addColumn("A");
      getState().addColumn("B");
      getState().addColumn("C");
      const colBId = getState().board.columns[1].id;

      getState().deleteColumn(colBId);
      expect(getState().board.columns).toHaveLength(2);
      expect(getState().board.columns[0].title).toBe("A");
      expect(getState().board.columns[0].order).toBe(0);
      expect(getState().board.columns[1].title).toBe("C");
      expect(getState().board.columns[1].order).toBe(1);
    });

    it("moveColumn reorders columns and updates order fields", () => {
      getState().addColumn("A");
      getState().addColumn("B");
      getState().addColumn("C");

      getState().moveColumn(0, 2);
      expect(getState().board.columns[0].title).toBe("B");
      expect(getState().board.columns[0].order).toBe(0);
      expect(getState().board.columns[1].title).toBe("C");
      expect(getState().board.columns[1].order).toBe(1);
      expect(getState().board.columns[2].title).toBe("A");
      expect(getState().board.columns[2].order).toBe(2);
    });
  });

  describe("Task operations", () => {
    let columnId: string;

    beforeEach(() => {
      getState().addColumn("Test Column");
      columnId = getState().board.columns[0].id;
    });

    it("addTask creates task with todo status and correct defaults", () => {
      getState().addTask(columnId, "My Task");
      const tasks = getState().board.columns[0].tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("My Task");
      expect(tasks[0].status).toBe("todo");
      expect(tasks[0].notes).toBe("");
      expect(tasks[0].order).toBe(0);
      expect(tasks[0].createdAt).toBeGreaterThan(0);
      expect(tasks[0].startedAt).toBeUndefined();
      expect(tasks[0].completedAt).toBeUndefined();
    });

    it("addTask assigns incrementing order", () => {
      getState().addTask(columnId, "First");
      getState().addTask(columnId, "Second");
      const tasks = getState().board.columns[0].tasks;
      expect(tasks[0].order).toBe(0);
      expect(tasks[1].order).toBe(1);
    });

    it("updateTask updates title and notes", () => {
      getState().addTask(columnId, "Original");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().updateTask(columnId, taskId, { title: "Updated" });
      expect(getState().board.columns[0].tasks[0].title).toBe("Updated");

      getState().updateTask(columnId, taskId, { notes: "Some notes" });
      expect(getState().board.columns[0].tasks[0].notes).toBe("Some notes");
    });

    it("updateTask sets startedAt when moving to queued", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().updateTask(columnId, taskId, { status: "queued" });
      const task = getState().board.columns[0].tasks[0];
      expect(task.status).toBe("queued");
      expect(task.startedAt).toBeGreaterThan(0);
    });

    it("updateTask does not overwrite existing startedAt", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().updateTask(columnId, taskId, { status: "queued" });
      const firstStartedAt = getState().board.columns[0].tasks[0].startedAt;

      // Move away and back
      getState().updateTask(columnId, taskId, { status: "in-review" });
      getState().updateTask(columnId, taskId, { status: "queued" });
      expect(getState().board.columns[0].tasks[0].startedAt).toBe(
        firstStartedAt
      );
    });

    it("updateTask sets completedAt when moving to done", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().updateTask(columnId, taskId, { status: "done" });
      const task = getState().board.columns[0].tasks[0];
      expect(task.status).toBe("done");
      expect(task.completedAt).toBeGreaterThan(0);
    });

    it("updateTask clears completedAt when moving away from done", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().updateTask(columnId, taskId, { status: "done" });
      expect(
        getState().board.columns[0].tasks[0].completedAt
      ).toBeGreaterThan(0);

      getState().updateTask(columnId, taskId, { status: "todo" });
      expect(getState().board.columns[0].tasks[0].completedAt).toBeUndefined();
    });

    it("deleteTask removes task and re-indexes orders", () => {
      getState().addTask(columnId, "A");
      getState().addTask(columnId, "B");
      getState().addTask(columnId, "C");
      const taskBId = getState().board.columns[0].tasks[1].id;

      getState().deleteTask(columnId, taskBId);
      const tasks = getState().board.columns[0].tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("A");
      expect(tasks[0].order).toBe(0);
      expect(tasks[1].title).toBe("C");
      expect(tasks[1].order).toBe(1);
    });

    it("cycleTaskStatus cycles forward: todo → queued → in-review → done", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;
      expect(getState().board.columns[0].tasks[0].status).toBe("todo");

      getState().cycleTaskStatus(columnId, taskId, 1);
      expect(getState().board.columns[0].tasks[0].status).toBe("queued");

      getState().cycleTaskStatus(columnId, taskId, 1);
      expect(getState().board.columns[0].tasks[0].status).toBe("in-review");

      getState().cycleTaskStatus(columnId, taskId, 1);
      expect(getState().board.columns[0].tasks[0].status).toBe("done");
    });

    it("cycleTaskStatus cycles backward", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().updateTask(columnId, taskId, { status: "done" });
      getState().cycleTaskStatus(columnId, taskId, -1);
      expect(getState().board.columns[0].tasks[0].status).toBe("in-review");
    });

    it("cycleTaskStatus wraps around", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      // Forward wrap: done → todo
      getState().updateTask(columnId, taskId, { status: "done" });
      getState().cycleTaskStatus(columnId, taskId, 1);
      expect(getState().board.columns[0].tasks[0].status).toBe("todo");

      // Backward wrap: todo → done
      getState().cycleTaskStatus(columnId, taskId, -1);
      expect(getState().board.columns[0].tasks[0].status).toBe("done");
    });

    it("cycleTaskStatus defaults to forward direction", () => {
      getState().addTask(columnId, "Task");
      const taskId = getState().board.columns[0].tasks[0].id;

      getState().cycleTaskStatus(columnId, taskId);
      expect(getState().board.columns[0].tasks[0].status).toBe("queued");
    });

    it("reorderTask reorders within column and updates order fields", () => {
      getState().addTask(columnId, "A");
      getState().addTask(columnId, "B");
      getState().addTask(columnId, "C");

      getState().reorderTask(columnId, 0, 2);
      const tasks = getState().board.columns[0].tasks;
      expect(tasks[0].title).toBe("B");
      expect(tasks[0].order).toBe(0);
      expect(tasks[1].title).toBe("C");
      expect(tasks[1].order).toBe(1);
      expect(tasks[2].title).toBe("A");
      expect(tasks[2].order).toBe(2);
    });

    it("moveTaskBetweenColumns moves task and updates orders in both columns", () => {
      getState().addColumn("Other Column");
      const col2Id = getState().board.columns[1].id;

      getState().addTask(columnId, "Task A");
      getState().addTask(columnId, "Task B");
      getState().addTask(col2Id, "Task C");

      getState().moveTaskBetweenColumns(columnId, col2Id, 0, 1);

      const col1Tasks = getState().board.columns[0].tasks;
      const col2Tasks = getState().board.columns[1].tasks;

      expect(col1Tasks).toHaveLength(1);
      expect(col1Tasks[0].title).toBe("Task B");
      expect(col1Tasks[0].order).toBe(0);

      expect(col2Tasks).toHaveLength(2);
      expect(col2Tasks[0].title).toBe("Task C");
      expect(col2Tasks[0].order).toBe(0);
      expect(col2Tasks[1].title).toBe("Task A");
      expect(col2Tasks[1].order).toBe(1);
    });
  });

  describe("Board operations", () => {
    it("exportBoard returns JSON string of board", () => {
      getState().addColumn("Test");
      const json = getState().exportBoard();
      const parsed = JSON.parse(json);
      expect(parsed.columns).toHaveLength(1);
      expect(parsed.columns[0].title).toBe("Test");
    });

    it("importBoard replaces board state", () => {
      const newBoard: Board = {
        id: "imported-board",
        columns: [
          {
            id: "col-1",
            title: "Imported Column",
            color: "#ff0000",
            order: 0,
            tasks: [],
          },
        ],
      };

      getState().importBoard(newBoard);
      expect(getState().board.id).toBe("imported-board");
      expect(getState().board.columns[0].title).toBe("Imported Column");
    });

    it("initialize loads from storage and sets initialized flag", async () => {
      const { storage } = await import("@/lib/storage");
      const mockBoard: Board = {
        id: "saved-board",
        columns: [
          {
            id: "c1",
            title: "Saved",
            color: "#000",
            order: 0,
            tasks: [],
          },
        ],
      };
      vi.mocked(storage.loadBoard).mockResolvedValueOnce(mockBoard);

      await getState().initialize();
      expect(getState().initialized).toBe(true);
      expect(getState().board.id).toBe("saved-board");
    });

    it("initialize creates default board when storage returns null", async () => {
      const { storage } = await import("@/lib/storage");
      vi.mocked(storage.loadBoard).mockResolvedValueOnce(null);

      await getState().initialize();
      expect(getState().initialized).toBe(true);
      expect(getState().board.columns).toEqual([]);
    });

    it("board migration converts old status names to new ones", () => {
      const oldBoard: Board = {
        id: "old-board",
        columns: [
          {
            id: "c1",
            title: "Col",
            color: "#000",
            order: 0,
            tasks: [
              {
                id: "t1",
                title: "Task 1",
                status: "in-progress" as any, // old "in-progress" → new "queued"
                notes: "",
                order: 0,
                createdAt: 1000,
              },
              {
                id: "t2",
                title: "Task 2",
                status: "review" as any, // old "review" → new "in-review"
                notes: "",
                order: 1,
                createdAt: 1000,
              },
              {
                id: "t3",
                title: "Task 3",
                status: "unknown-status" as any, // unknown → falls back to "todo"
                notes: "",
                order: 2,
                createdAt: 1000,
              },
            ],
          },
        ],
      };

      getState().importBoard(oldBoard);
      const tasks = getState().board.columns[0].tasks;
      expect(tasks[0].status).toBe("queued");
      expect(tasks[1].status).toBe("in-review");
      expect(tasks[2].status).toBe("todo");
    });

    it("board migration preserves valid status names", () => {
      const board: Board = {
        id: "valid-board",
        columns: [
          {
            id: "c1",
            title: "Col",
            color: "#000",
            order: 0,
            tasks: [
              { id: "t1", title: "T1", status: "todo", notes: "", order: 0, createdAt: 1000 },
              { id: "t2", title: "T2", status: "queued", notes: "", order: 1, createdAt: 1000 },
              { id: "t3", title: "T3", status: "in-review", notes: "", order: 2, createdAt: 1000 },
              { id: "t4", title: "T4", status: "done", notes: "", order: 3, createdAt: 1000 },
            ],
          },
        ],
      };

      getState().importBoard(board);
      const tasks = getState().board.columns[0].tasks;
      expect(tasks[0].status).toBe("todo");
      expect(tasks[1].status).toBe("queued");
      expect(tasks[2].status).toBe("in-review");
      expect(tasks[3].status).toBe("done");
    });
  });
});
