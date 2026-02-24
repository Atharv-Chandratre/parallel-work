import { Board } from "./types";

const STORAGE_KEY = "parallel-board";

export const storage = {
  loadBoard(): Board | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Board;
    } catch {
      return null;
    }
  },

  saveBoard(board: Board): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {
      console.error("Failed to save board to localStorage");
    }
  },
};
