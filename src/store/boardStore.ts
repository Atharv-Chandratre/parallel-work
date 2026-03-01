import { create } from "zustand";
import { nanoid } from "nanoid";
import { Board, Column, Task, TaskStatus, COLUMN_COLORS } from "@/lib/types";
import { storage } from "@/lib/storage";

type BoardState = {
  board: Board;
  initialized: boolean;

  initialize: () => Promise<void>;

  addColumn: (title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;

  addTask: (columnId: string, title: string) => void;
  updateTask: (
    columnId: string,
    taskId: string,
    updates: Partial<Pick<Task, "title" | "notes" | "status">>
  ) => void;
  deleteTask: (columnId: string, taskId: string) => void;
  cycleTaskStatus: (columnId: string, taskId: string, direction?: number) => void;
  reorderTask: (columnId: string, fromIndex: number, toIndex: number) => void;
  moveTaskBetweenColumns: (
    fromColumnId: string,
    toColumnId: string,
    fromIndex: number,
    toIndex: number
  ) => void;

  exportBoard: () => string;
  importBoard: (board: Board) => void;
};

const createDefaultBoard = (): Board => ({
  id: nanoid(),
  columns: [],
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const persist = (board: Board) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    storage.saveBoard(board);
  }, 300);
};

const OLD_TO_NEW_STATUS: Record<string, TaskStatus> = {
  queued: "todo",
  "in-progress": "queued",
  review: "in-review",
  done: "done",
};

const VALID_STATUSES: TaskStatus[] = ["todo", "queued", "in-review", "done"];

function migrateBoard(board: Board): Board {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      tasks: col.tasks.map((task) => {
        const status = VALID_STATUSES.includes(task.status as TaskStatus)
          ? (task.status as TaskStatus)
          : (OLD_TO_NEW_STATUS[task.status] ?? "todo");
        return { ...task, status };
      }),
    })),
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: createDefaultBoard(),
  initialized: false,

  initialize: async () => {
    const saved = await storage.loadBoard();
    const board = saved ? migrateBoard(saved) : createDefaultBoard();
    set({
      board,
      initialized: true,
    });
  },

  addColumn: (title: string) => {
    set((state) => {
      const colorIndex = state.board.columns.length % COLUMN_COLORS.length;
      const newColumn: Column = {
        id: nanoid(),
        title,
        color: COLUMN_COLORS[colorIndex],
        order: state.board.columns.length,
        tasks: [],
      };
      const board = {
        ...state.board,
        columns: [...state.board.columns, newColumn],
      };
      persist(board);
      return { board };
    });
  },

  renameColumn: (columnId: string, title: string) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => (col.id === columnId ? { ...col, title } : col)),
      };
      persist(board);
      return { board };
    });
  },

  deleteColumn: (columnId: string) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns
          .filter((col) => col.id !== columnId)
          .map((col, i) => ({ ...col, order: i })),
      };
      persist(board);
      return { board };
    });
  },

  moveColumn: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const columns = [...state.board.columns];
      const [moved] = columns.splice(fromIndex, 1);
      columns.splice(toIndex, 0, moved);
      const board = {
        ...state.board,
        columns: columns.map((col, i) => ({ ...col, order: i })),
      };
      persist(board);
      return { board };
    });
  },

  addTask: (columnId: string, title: string) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          const newTask: Task = {
            id: nanoid(),
            title,
            status: "todo" as TaskStatus,
            notes: "",
            order: col.tasks.length,
            createdAt: Date.now(),
          };
          return { ...col, tasks: [...col.tasks, newTask] };
        }),
      };
      persist(board);
      return { board };
    });
  },

  updateTask: (columnId, taskId, updates) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const updated = { ...task, ...updates };
              if (updates.status === "queued" && !task.startedAt) {
                updated.startedAt = Date.now();
              }
              if (updates.status === "done" && !task.completedAt) {
                updated.completedAt = Date.now();
              }
              if (updates.status && updates.status !== "done" && task.completedAt) {
                updated.completedAt = undefined;
              }
              return updated;
            }),
          };
        }),
      };
      persist(board);
      return { board };
    });
  },

  deleteTask: (columnId, taskId) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId).map((t, i) => ({ ...t, order: i })),
          };
        }),
      };
      persist(board);
      return { board };
    });
  },

  cycleTaskStatus: (columnId, taskId, direction = 1) => {
    const state = get();
    const col = state.board.columns.find((c) => c.id === columnId);
    const task = col?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const statusOrder: TaskStatus[] = ["todo", "queued", "in-review", "done"];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + direction + statusOrder.length) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];

    get().updateTask(columnId, taskId, { status: nextStatus });
  },

  reorderTask: (columnId, fromIndex, toIndex) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          const tasks = [...col.tasks];
          const [moved] = tasks.splice(fromIndex, 1);
          tasks.splice(toIndex, 0, moved);
          return {
            ...col,
            tasks: tasks.map((t, i) => ({ ...t, order: i })),
          };
        }),
      };
      persist(board);
      return { board };
    });
  },

  moveTaskBetweenColumns: (fromColumnId, toColumnId, fromIndex, toIndex) => {
    set((state) => {
      let movedTask: Task | null = null;
      const columns = state.board.columns.map((col) => {
        if (col.id === fromColumnId) {
          const tasks = [...col.tasks];
          [movedTask] = tasks.splice(fromIndex, 1);
          return {
            ...col,
            tasks: tasks.map((t, i) => ({ ...t, order: i })),
          };
        }
        return col;
      });

      if (!movedTask) return state;

      const finalColumns = columns.map((col) => {
        if (col.id === toColumnId) {
          const tasks = [...col.tasks];
          tasks.splice(toIndex, 0, movedTask!);
          return {
            ...col,
            tasks: tasks.map((t, i) => ({ ...t, order: i })),
          };
        }
        return col;
      });

      const board = { ...state.board, columns: finalColumns };
      persist(board);
      return { board };
    });
  },

  exportBoard: () => {
    return JSON.stringify(get().board, null, 2);
  },

  importBoard: (board: Board) => {
    const migrated = migrateBoard(board);
    set({ board: migrated });
    persist(migrated);
  },
}));
