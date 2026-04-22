import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  Board,
  BoardsCollection,
  Column,
  Task,
  TaskStatus,
  TaskLink,
  COLUMN_COLORS,
} from "@/lib/types";
import { storage } from "@/lib/storage";
import { useToastStore } from "./toastStore";

type BoardState = {
  /** Currently active board — a view of boards[activeBoardId]. */
  board: Board;
  /** All boards, keyed by id. */
  boards: Record<string, Board>;
  activeBoardId: string;
  initialized: boolean;
  expandedTaskId: string | null;
  undoCount: number;
  redoCount: number;

  initialize: () => Promise<void>;
  setExpandedTaskId: (taskId: string | null) => void;
  flushPendingSave: () => void;
  hydrateFromStorage: (collection: BoardsCollection) => void;
  undo: () => void;
  redo: () => void;

  switchBoard: (id: string) => void;
  createBoard: (name: string) => string;
  renameBoardById: (id: string, name: string) => void;
  deleteBoardById: (id: string) => void;
  toggleBoardHidden: (id: string) => void;

  addColumn: (title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;
  toggleColumnHidden: (columnId: string) => void;

  addTask: (columnId: string, title: string) => void;
  addTaskFromLink: (columnId: string, url: string) => string;
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

const createDefaultBoard = (name = "My Board"): Board => ({
  id: nanoid(),
  name,
  columns: [],
});

const createDefaultCollection = (): BoardsCollection => {
  const board = createDefaultBoard();
  return { activeBoardId: board.id, boards: { [board.id]: board } };
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let lastErrorToastAt = 0;

const buildCollection = (): BoardsCollection => {
  const s = useBoardStore.getState();
  // Mirror the live active board into the boards map.
  return {
    activeBoardId: s.activeBoardId,
    boards: { ...s.boards, [s.activeBoardId]: s.board },
  };
};

const flushNow = async () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!dirty) return;
  dirty = false;
  const collection = buildCollection();
  const result = await storage.saveBoards(collection);
  if (!result.ok) {
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

// Called from each mutation action. Board param retained for signature
// compatibility but the full collection is derived from current state on
// flush — the saved snapshot always reflects the latest state.
const persist = (_board: Board) => {
  void _board;
  dirty = true;
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

const defaultCollection = createDefaultCollection();

export const useBoardStore = create<BoardState>((set, get) => ({
  board: defaultCollection.boards[defaultCollection.activeBoardId],
  boards: defaultCollection.boards,
  activeBoardId: defaultCollection.activeBoardId,
  initialized: false,
  expandedTaskId: null,
  undoCount: 0,
  redoCount: 0,

  initialize: async () => {
    const saved = await storage.loadBoards();
    let collection: BoardsCollection;
    if (saved && saved.boards && Object.keys(saved.boards).length > 0) {
      const migratedBoards = Object.fromEntries(
        Object.entries(saved.boards).map(([id, b]) => [id, migrateBoard(b)])
      );
      const savedActive = migratedBoards[saved.activeBoardId];
      const pickActive = () => {
        if (savedActive && !savedActive.hidden) return saved.activeBoardId;
        const firstVisible = Object.values(migratedBoards).find((b) => !b.hidden);
        if (firstVisible) return firstVisible.id;
        return savedActive ? saved.activeBoardId : Object.keys(migratedBoards)[0];
      };
      collection = {
        activeBoardId: pickActive(),
        boards: migratedBoards,
      };
    } else {
      collection = createDefaultCollection();
    }
    set({
      board: collection.boards[collection.activeBoardId],
      boards: collection.boards,
      activeBoardId: collection.activeBoardId,
      initialized: true,
    });
  },

  setExpandedTaskId: (taskId) => set({ expandedTaskId: taskId }),

  flushPendingSave: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (dirty) {
      storage.saveBoardsSync(buildCollection());
      dirty = false;
    }
  },

  hydrateFromStorage: (collection: BoardsCollection) => {
    suppressHistory = true;
    const migrated: Record<string, Board> = Object.fromEntries(
      Object.entries(collection.boards).map(([id, b]) => [id, migrateBoard(b)])
    );
    const activeId = migrated[collection.activeBoardId]
      ? collection.activeBoardId
      : Object.keys(migrated)[0];
    set({
      board: migrated[activeId],
      boards: migrated,
      activeBoardId: activeId,
    });
    suppressHistory = false;
  },

  switchBoard: (id) => {
    const state = get();
    if (!state.boards[id] || id === state.activeBoardId) return;
    // Persist any in-flight edits to the current board before switching.
    if (dirty) {
      storage.saveBoardsSync(buildCollection());
      dirty = false;
    }
    // Snapshot current live board into boards map.
    const updatedBoards = { ...state.boards, [state.activeBoardId]: state.board };
    suppressHistory = true;
    set({ boards: updatedBoards, activeBoardId: id, board: updatedBoards[id] });
    suppressHistory = false;
    persist(updatedBoards[id]);
  },

  createBoard: (name) => {
    const newBoard = createDefaultBoard(name.trim() || "Untitled Board");
    set((state) => {
      const boards = {
        ...state.boards,
        [state.activeBoardId]: state.board, // snapshot current
        [newBoard.id]: newBoard,
      };
      return { boards, activeBoardId: newBoard.id, board: newBoard };
    });
    persist(newBoard);
    return newBoard.id;
  },

  renameBoardById: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => {
      if (!state.boards[id]) return state;
      const updated = { ...state.boards[id], name: trimmed };
      const boards = { ...state.boards, [id]: updated };
      const isActive = state.activeBoardId === id;
      return {
        boards,
        ...(isActive ? { board: updated } : {}),
      };
    });
    persist(get().board);
  },

  deleteBoardById: (id) => {
    set((state) => {
      if (!state.boards[id]) return state;
      const remaining = { ...state.boards };
      delete remaining[id];
      if (Object.keys(remaining).length === 0) {
        const seed = createDefaultBoard();
        return { boards: { [seed.id]: seed }, activeBoardId: seed.id, board: seed };
      }
      if (state.activeBoardId === id) {
        const nextId = Object.keys(remaining)[0];
        return { boards: remaining, activeBoardId: nextId, board: remaining[nextId] };
      }
      return { boards: remaining };
    });
    persist(get().board);
  },

  toggleBoardHidden: (id) => {
    const state = get();
    const target = state.boards[id];
    if (!target) return;
    const willHide = !target.hidden;
    if (willHide) {
      const visibleOthers = Object.values(state.boards).filter((b) => b.id !== id && !b.hidden);
      if (visibleOthers.length === 0) {
        useToastStore.getState().push("Can't hide the only visible board.", "error");
        return;
      }
      const updated = { ...target, hidden: true };
      const boards = { ...state.boards, [id]: updated };
      const isActive = state.activeBoardId === id;
      if (isActive) {
        const nextId = visibleOthers[0].id;
        // Snapshot current live board before switching.
        boards[state.activeBoardId] = { ...state.board, hidden: true };
        set({ boards, activeBoardId: nextId, board: boards[nextId] });
      } else {
        set({ boards });
      }
    } else {
      const updated = { ...target, hidden: false };
      const boards = { ...state.boards, [id]: updated };
      const isActive = state.activeBoardId === id;
      set({ boards, ...(isActive ? { board: updated } : {}) });
    }
    persist(get().board);
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

  toggleColumnHidden: (columnId: string) => {
    set((state) => {
      const target = state.board.columns.find((c) => c.id === columnId);
      if (!target) return state;
      const willHide = !target.hidden;
      if (willHide) {
        const visibleOthers = state.board.columns.filter((c) => c.id !== columnId && !c.hidden);
        if (visibleOthers.length === 0) {
          useToastStore.getState().push("Can't hide the only visible project.", "error");
          return state;
        }
      }
      const board = {
        ...state.board,
        columns: state.board.columns.map((c) =>
          c.id === columnId ? { ...c, hidden: willHide } : c
        ),
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

  /**
   * Create a new task whose first link is the given URL. Title starts as the
   * URL itself so the card is never blank; callers fetch the page title async
   * and update the task with it.
   */
  addTaskFromLink: (columnId: string, url: string) => {
    const trimmed = url.trim();
    const taskId = nanoid();
    const linkId = nanoid();
    set((state) => {
      const board = {
        ...state.board,
        columns: state.board.columns.map((col) => {
          if (col.id !== columnId) return col;
          const newTask: Task = {
            id: taskId,
            title: trimmed,
            status: "todo" as TaskStatus,
            notes: "",
            order: col.tasks.length,
            createdAt: Date.now(),
            links: [{ id: linkId, url: trimmed }],
          };
          return { ...col, tasks: [...col.tasks, newTask] };
        }),
      };
      persist(board);
      return { board };
    });
    return taskId;
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
    // Imported boards replace the currently-active board in place.
    const migrated = migrateBoard({ ...board, id: get().activeBoardId });
    set((state) => ({
      board: migrated,
      boards: { ...state.boards, [state.activeBoardId]: migrated },
    }));
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
