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
      // 503 + STORAGE_READONLY means the server can't persist (e.g. zeroBox's
      // non-durable bundle FS); latch apiAvailable=false so we never bother it with PUTs.
      if (res.status === 503) {
        apiAvailable = false;
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
        if (!res.ok) {
          // Server explicitly told us it has no writable storage. Flip the
          // module flag so subsequent saves don't even try the network;
          // localStorage already has the data, so this is not an error.
          if (res.status === 503) {
            let code: string | undefined;
            try {
              const body = (await res.json()) as { code?: string };
              code = body?.code;
            } catch {
              // ignore
            }
            if (code === "STORAGE_READONLY") {
              apiAvailable = false;
              return { ok: true };
            }
          }
          // Best-effort: pull the server's error detail so the user sees a useful toast.
          let detail = `HTTP ${res.status}`;
          try {
            const body = (await res.json()) as { error?: string; detail?: string };
            if (body?.detail) detail = `HTTP ${res.status}: ${body.detail}`;
            else if (body?.error) detail = `HTTP ${res.status}: ${body.error}`;
          } catch {
            // Non-JSON body, fall through with status-only message.
          }
          return { ok: false, apiError: detail };
        }
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
