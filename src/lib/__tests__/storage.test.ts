import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Board } from "@/lib/types";

const mockBoard: Board = {
  id: "test-board",
  columns: [
    { id: "c1", title: "Col 1", color: "#000", order: 0, tasks: [] },
  ],
};

describe("storage", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore window if it was deleted
    if (!globalThis.window && originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });

  it("loadBoard returns null on server (window undefined)", async () => {
    const savedWindow = globalThis.window;
    // @ts-expect-error - simulating server environment
    delete globalThis.window;

    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoard();
    expect(result).toBeNull();

    Object.defineProperty(globalThis, "window", {
      value: savedWindow,
      writable: true,
      configurable: true,
    });
  });

  it("loadBoard fetches from API and returns data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBoard),
    });

    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoard();
    expect(result).toEqual(mockBoard);
    expect(fetch).toHaveBeenCalledWith("/api/board");
  });

  it("loadBoard falls back to localStorage when API fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    Storage.prototype.getItem = vi
      .fn()
      .mockReturnValue(JSON.stringify(mockBoard));

    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoard();
    expect(result).toEqual(mockBoard);
  });

  it("loadBoard falls back to localStorage when API returns null data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });
    Storage.prototype.getItem = vi
      .fn()
      .mockReturnValue(JSON.stringify(mockBoard));

    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoard();
    expect(result).toEqual(mockBoard);
  });

  it("saveBoard saves to localStorage and API when available", async () => {
    // First load to set apiAvailable = true
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBoard),
    });
    Storage.prototype.setItem = vi.fn();

    const { storage } = await import("@/lib/storage");
    await storage.loadBoard();

    // Now save
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    await storage.saveBoard(mockBoard);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "parallel-board",
      JSON.stringify(mockBoard)
    );
    expect(fetch).toHaveBeenCalledWith("/api/board", expect.objectContaining({
      method: "PUT",
    }));
  });

  it("saveBoard no-ops on server", async () => {
    const savedWindow = globalThis.window;
    // @ts-expect-error - simulating server environment
    delete globalThis.window;

    const { storage } = await import("@/lib/storage");
    await storage.saveBoard(mockBoard);
    // Should not throw, just return

    Object.defineProperty(globalThis, "window", {
      value: savedWindow,
      writable: true,
      configurable: true,
    });
  });
});
