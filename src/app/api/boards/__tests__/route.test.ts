import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
  },
}));

describe("API route /api/boards", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("returns existing boards collection", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const collection = {
        activeBoardId: "a",
        boards: { a: { id: "a", name: "Alpha", columns: [] } },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(collection));
      const { GET } = await import("@/app/api/boards/route");
      const res = await GET();
      const data = await res.json();
      expect(data).toEqual(collection);
    });

    it("returns null when nothing exists", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.access).mockRejectedValue(new Error("no")); // boards.json missing
      const err = new Error("nope") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fs.readFile).mockRejectedValue(err);
      const { GET } = await import("@/app/api/boards/route");
      const res = await GET();
      const data = await res.json();
      expect(data).toBeNull();
    });

    it("migrates legacy board.json into a collection on first read", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.access).mockRejectedValue(new Error("no")); // boards.json missing
      // readFile called twice: once for legacy board.json (migration),
      // then once for boards.json (now-written).
      const legacy = { id: "legacy-id", columns: [] };
      const migrated = {
        activeBoardId: "legacy-id",
        boards: { "legacy-id": { ...legacy, name: "My Board" } },
      };
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(legacy))
        .mockResolvedValueOnce(JSON.stringify(migrated));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const { GET } = await import("@/app/api/boards/route");
      const res = await GET();
      const data = await res.json();
      expect(data.activeBoardId).toBe("legacy-id");
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe("PUT", () => {
    it("writes the collection to boards.json", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const payload = { activeBoardId: "a", boards: {} };
      const req = new Request("http://localhost/api/boards", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const { PUT } = await import("@/app/api/boards/route");
      const res = await PUT(req);
      expect(await res.json()).toEqual({ ok: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("boards.json"),
        JSON.stringify(payload, null, 2),
        "utf-8"
      );
    });

    it("returns 500 on write failure", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error("nope"));
      const req = new Request("http://localhost/api/boards", {
        method: "PUT",
        body: JSON.stringify({ activeBoardId: "a", boards: {} }),
      });
      const { PUT } = await import("@/app/api/boards/route");
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });

    it("returns 503 STORAGE_READONLY on Vercel's read-only filesystem (ENOENT on mkdir)", async () => {
      const fs = (await import("fs/promises")).default;
      const err = new Error(
        "ENOENT: no such file or directory, mkdir '/var/task/data'"
      ) as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fs.mkdir).mockRejectedValue(err);
      const req = new Request("http://localhost/api/boards", {
        method: "PUT",
        body: JSON.stringify({ activeBoardId: "a", boards: {} }),
      });
      const { PUT } = await import("@/app/api/boards/route");
      const res = await PUT(req);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.code).toBe("STORAGE_READONLY");
    });

    it("short-circuits to 503 when VERCEL env is set", async () => {
      const prev = process.env.VERCEL;
      process.env.VERCEL = "1";
      try {
        const req = new Request("http://localhost/api/boards", {
          method: "PUT",
          body: JSON.stringify({ activeBoardId: "a", boards: {} }),
        });
        const { PUT } = await import("@/app/api/boards/route");
        const res = await PUT(req);
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.code).toBe("STORAGE_READONLY");
      } finally {
        if (prev === undefined) delete process.env.VERCEL;
        else process.env.VERCEL = prev;
      }
    });
  });
});
