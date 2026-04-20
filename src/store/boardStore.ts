import { create } from "zustand";
import { nanoid } from "nanoid";
import { Board, Column, Task, TaskStatus, TaskLink, COLUMN_COLORS } from "@/lib/types";
import { storage } from "@/lib/storage";
import { useToastStore } from "./toastStore";

type BoardState = {
  board: Board;
  initialized: boolean;
  expandedTaskId: string | null;
  undoCount: number;
  redoCount: number;

  initialize: () => Promise<void>;
  setExpandedTaskId: (taskId: string | null) => void;
  flushPendingSave: () => void;
  hydrateFromStorage: (board: Board) => void;
  undo: () => void;
  redo: () => void;

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
  deleteDoneTasks: (columnId: string) => void;
  cycleTaskStatus: (columnId: string, taskId: string, direction?: number) => void;
  reorderTask: (columnId: string, fromIndex: number, toIndex: number) => void;
  addTaskLink: (columnId: string, taskId: string, url: string) => void;
  updateTaskLink: (columnId: string, taskId: string, linkId: string, url: string) => void;
  removeTaskLink: (columnId: string, taskId: string, linkId: string) => void;
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
let pendingBoard: Board | null = null;
let lastErrorToastAt = 0;

const flushNow = async () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!pendingBoard) return;
  const toSave = pendingBoard;
  pendingBoard = null;
  const result = await storage.saveBoard(toSave);
  if (!result.ok) {
    // Throttle error toasts so rapid edits don't spam.
    const now = Date.now();
    if (now - lastErrorToastAt > 5000) {
      lastErrorToastAt = now;
      useToastStore
        .getState()
        .push(
          `Couldn't save to server (${result.apiError ?? "unknown error"}). Changes kept in this browser only.`,
          "error"
        );
    }
  }
};

const persist = (board: Board) => {
  pendingBoard = board;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushNow();
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
        // Legacy githubUrl -> links[]
        let links = Array.isArray(task.links) ? task.links : [];
        if (task.githubUrl && !links.some((l) => l.url === task.githubUrl)) {
          links = [{ id: nanoid(), url: task.githubUrl }, ...links];
        }
        return { ...task, status, links };
      }),
    })),
  };
}

const undoStack: Board[] = [];
const redoStack: Board[] = [];
const MAX_HISTORY = 30;
let suppressHistory = false;

export function _resetHistoryForTests() {
  undoStack.length = 0;
  redoStack.length = 0;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: createDefaultBoard(),
  initialized: false,
  expandedTaskId: null,
  undoCount: 0,
  redoCount: 0,

  initialize: async () => {
    const saved = await storage.loadBoard();
    const board = saved ? migrateBoard(saved) : createDefaultBoard();
    set({
      board,
      initialized: true,
    });
  },

  setExpandedTaskId: (taskId) => set({ expandedTaskId: taskId }),

  flushPendingSave: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pendingBoard) {
      storage.saveBoardSync(pendingBoard);
    }
  },

  hydrateFromStorage: (board: Board) => {
    // Update state without triggering a persist write (prevents cross-tab loop).
    suppressHistory = true;
    set({ board: migrateBoard(board) });
    suppressHistory = false;
  },

  undo: () => {
    const prev = undoStack.pop();
    if (!prev) return;
    const current = get().board;
    redoStack.push(current);
    if (redoStack.length > MAX_HISTORY) redoStack.shift();
    suppressHistory = true;
    set({ board: prev, undoCount: undoStack.length, redoCount: redoStack.length });
    suppressHistory = false;
    persist(prev);
  },

  redo: () => {
    const next = redoStack.pop();
    if (!next) return;
    const current = get().board;
    undoStack.push(current);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    suppressHistory = true;
    set({ board: next, undoCount: undoStack.length, redoCount: redoStack.length });
    suppressHistory = false;
    persist(next);
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
            links: [],
          };
          return { ...col, tasks: [...col.tasks, newTask] };
        }),
      };
      persist(board);
      return { board };
    });
  },

  addTaskLink: (columnId, taskId, url) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const existing = task.links ?? [];
              const newLink: TaskLink = { id: nanoid(), url: trimmed };
              return { ...task, links: [...existing, newLink] };
            }),
          };
        }),
      };
      persist(board);
      return { board };
    });
  },

  updateTaskLink: (columnId, taskId, linkId, url) => {
    const trimmed = url.trim();
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const links = (task.links ?? []).flatMap((l) => {
                if (l.id !== linkId) return [l];
                return trimmed ? [{ ...l, url: trimmed }] : [];
              });
              return { ...task, links };
            }),
          };
        }),
      };
      persist(board);
      return { board };
    });
  },

  removeTaskLink: (columnId, taskId, linkId) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.map((task) => {
              if (task.id !== taskId) return task;
              return { ...task, links: (task.links ?? []).filter((l) => l.id !== linkId) };
            }),
          };
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

  deleteDoneTasks: (columnId) => {
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.status !== "done").map((t, i) => ({ ...t, order: i })),
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

// History capture: push the previous board onto the undo stack whenever
// the board ref changes (and we're not in an undo/redo/hydrate op).
useBoardStore.subscribe((state, prev) => {
  if (suppressHistory) return;
  if (!prev.initialized) return;
  if (state.board === prev.board) return;
  undoStack.push(prev.board);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  // Reflect new counts into state so UI can show availability.
  suppressHistory = true;
  useBoardStore.setState({ undoCount: undoStack.length, redoCount: 0 });
  suppressHistory = false;
});
