import { Board, BoardsCollection } from "./types";

export const STORAGE_KEY = "parallel-boards";
const LEGACY_STORAGE_KEY = "parallel-board";

let apiAvailable: boolean | null = null;

function readLocalCollection(): BoardsCollection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BoardsCollection;
    // Legacy single-board fallback
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Board;
      const id = legacy.id || "default";
      return {
        activeBoardId: id,
        boards: { [id]: { ...legacy, id, name: legacy.name ?? "My Board" } },
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeLocalCollection(collection: BoardsCollection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  } catch {
    console.error("Failed to save boards collection to localStorage");
  }
}

export const storage = {
  async loadBoards(): Promise<BoardsCollection | null> {
    if (typeof window === "undefined") return null;
    try {
      const res = await fetch("/api/boards");
      if (res.ok) {
        const data = await res.json();
        apiAvailable = true;
        if (data) return data as BoardsCollection;
        return readLocalCollection();
      }
    } catch {
      // API not available
    }
    apiAvailable = false;
    return readLocalCollection();
  },

  async saveBoards(collection: BoardsCollection): Promise<{ ok: boolean; apiError?: string }> {
    if (typeof window === "undefined") return { ok: true };
    writeLocalCollection(collection);
    if (apiAvailable) {
      try {
        const res = await fetch("/api/boards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(collection),
        });
        if (!res.ok) return { ok: false, apiError: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, apiError: err instanceof Error ? err.message : "network error" };
      }
    }
    return { ok: true };
  },

  saveBoardsSync(collection: BoardsCollection): void {
    if (typeof window === "undefined") return;
    writeLocalCollection(collection);
  },
};
