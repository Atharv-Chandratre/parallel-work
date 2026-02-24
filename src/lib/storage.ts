import { Board } from "./types";

export const storage = {
  async loadBoard(): Promise<Board | null> {
    try {
      const res = await fetch("/api/board");
      if (!res.ok) return null;
      const data = await res.json();
      return data as Board | null;
    } catch {
      return null;
    }
  },

  async saveBoard(board: Board): Promise<void> {
    try {
      await fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(board),
      });
    } catch {
      console.error("Failed to save board");
    }
  },
};
