import { Board } from "./types";

const STORAGE_KEY = "parallel-board";

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

  async saveBoard(board: Board): Promise<void> {
    if (typeof window === "undefined") return;

    // Always save to localStorage as a fallback/backup
    localStorageBackend.saveBoard(board);

    if (apiAvailable) {
      try {
        await fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(board),
        });
      } catch {
        // API write failed, localStorage already has the data
      }
    }
  },
};
