import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Board, BoardsCollection } from "@/lib/types";

const mockBoard: Board = {
  id: "test-board",
  name: "Test",
  columns: [{ id: "c1", title: "Col 1", color: "#000", order: 0, tasks: [] }],
};
const mockCollection: BoardsCollection = {
  activeBoardId: "test-board",
  boards: { "test-board": mockBoard },
};

describe("storage", () => {
  const originalWindow = globalThis.window;
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    if (!globalThis.window && originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
  });

  it("loadBoards returns null on server (window undefined)", async () => {
    const savedWindow = globalThis.window;
    // @ts-expect-error - simulating server environment
    delete globalThis.window;
    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoards();
    expect(result).toBeNull();
    Object.defineProperty(globalThis, "window", {
      value: savedWindow,
      writable: true,
      configurable: true,
    });
  });

  it("loadBoards fetches from API and returns collection", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCollection),
    });
    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoards();
    expect(result).toEqual(mockCollection);
    expect(fetch).toHaveBeenCalledWith("/api/boards");
  });

  it("loadBoards falls back to localStorage when API fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    localStorage.setItem("parallel-boards", JSON.stringify(mockCollection));
    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoards();
    expect(result).toEqual(mockCollection);
  });

  it("loadBoards migrates legacy parallel-board key when present", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });
    localStorage.setItem("parallel-board", JSON.stringify(mockBoard));
    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoards();
    expect(result?.activeBoardId).toBe("test-board");
    expect(result?.boards["test-board"].name).toBe("Test");
  });

  it("saveBoards writes to localStorage and API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCollection),
    });
    const { storage } = await import("@/lib/storage");
    await storage.loadBoards();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as Response);
    const result = await storage.saveBoards(mockCollection);
    expect(result.ok).toBe(true);
    expect(localStorage.getItem("parallel-boards")).toBe(JSON.stringify(mockCollection));
    expect(fetch).toHaveBeenCalledWith("/api/boards", expect.objectContaining({ method: "PUT" }));
  });

  it("saveBoards returns ok=false when API write fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCollection),
    });
    const { storage } = await import("@/lib/storage");
    await storage.loadBoards();
    vi.mocked(fetch).mockRejectedValue(new Error("boom"));
    const result = await storage.saveBoards(mockCollection);
    expect(result.ok).toBe(false);
    expect(result.apiError).toContain("boom");
    expect(localStorage.getItem("parallel-boards")).toBe(JSON.stringify(mockCollection));
  });

  it("saveBoards silently drops to localStorage-only on 503 STORAGE_READONLY", async () => {
    // First: loadBoards marks apiAvailable = true.
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCollection),
    });
    const { storage } = await import("@/lib/storage");
    await storage.loadBoards();

    // Now the first PUT gets the read-only signal.
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ code: "STORAGE_READONLY" }),
    } as Response);
    const first = await storage.saveBoards(mockCollection);
    expect(first.ok).toBe(true); // no error toast
    expect(first.apiError).toBeUndefined();

    // Subsequent saves should skip the network entirely.
    const callCountBefore = vi.mocked(fetch).mock.calls.length;
    const second = await storage.saveBoards(mockCollection);
    expect(second.ok).toBe(true);
    expect(vi.mocked(fetch).mock.calls.length).toBe(callCountBefore);
  });

  it("loadBoards treats 503 as API-unavailable without throwing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ code: "STORAGE_READONLY" }),
    });
    localStorage.setItem("parallel-boards", JSON.stringify(mockCollection));
    const { storage } = await import("@/lib/storage");
    const result = await storage.loadBoards();
    expect(result).toEqual(mockCollection);
  });

  it("saveBoards surfaces the server's detail message on a 500 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCollection),
    });
    const { storage } = await import("@/lib/storage");
    await storage.loadBoards();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Failed to save boards", detail: "EACCES: disk full" }),
    } as Response);
    const result = await storage.saveBoards(mockCollection);
    expect(result.ok).toBe(false);
    expect(result.apiError).toContain("HTTP 500");
    expect(result.apiError).toContain("EACCES: disk full");
  });

  it("saveBoards no-ops on server", async () => {
    const savedWindow = globalThis.window;
    // @ts-expect-error - simulating server environment
    delete globalThis.window;
    const { storage } = await import("@/lib/storage");
    await storage.saveBoards(mockCollection);
    Object.defineProperty(globalThis, "window", {
      value: savedWindow,
      writable: true,
      configurable: true,
    });
  });
});
