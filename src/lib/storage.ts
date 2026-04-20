import { Board } from "./types";

export const STORAGE_KEY = "parallel-board";

let apiAvailable: boolean | null = null;

const localStorageBackend = {
  loadBoard(): Board | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Board;
    } catch {
      return null;
    }
  },

  saveBoard(board: Board): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {
      console.error("Failed to save board to localStorage");
    }
  },
};

export const storage = {
  async loadBoard(): Promise<Board | null> {
    if (typeof window === "undefined") return null;

    try {
      const res = await fetch("/api/board");
      if (res.ok) {
        const data = await res.json();
        apiAvailable = true;
        if (data) return data as Board;
        // API works but no data on server -- check localStorage for existing data
        return localStorageBackend.loadBoard();
      }
    } catch {
      // API not available (e.g. Vercel serverless with no persistent disk)
    }

    apiAvailable = false;
    return localStorageBackend.loadBoard();
  },

  async saveBoard(board: Board): Promise<{ ok: boolean; apiError?: string }> {
    if (typeof window === "undefined") return { ok: true };

    // Always save to localStorage as a fallback/backup
    localStorageBackend.saveBoard(board);

    if (apiAvailable) {
      try {
        const res = await fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(board),
        });
        if (!res.ok) {
          return { ok: false, apiError: `HTTP ${res.status}` };
        }
      } catch (err) {
        return { ok: false, apiError: err instanceof Error ? err.message : "network error" };
      }
    }
    return { ok: true };
  },

  /**
   * Best-effort synchronous save using localStorage only. Use on beforeunload
   * or visibilitychange to avoid losing an in-flight debounced edit.
   */
  saveBoardSync(board: Board): void {
    if (typeof window === "undefined") return;
    localStorageBackend.saveBoard(board);
  },
};
