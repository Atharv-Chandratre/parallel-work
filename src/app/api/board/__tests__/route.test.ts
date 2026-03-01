import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe("API route /api/board", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("returns board JSON when file exists", async () => {
      const fs = (await import("fs/promises")).default;
      const boardData = { id: "b1", columns: [] };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(boardData));

      const { GET } = await import("@/app/api/board/route");
      const response = await GET();
      const data = await response.json();

      expect(data).toEqual(boardData);
    });

    it("returns null when file does not exist (ENOENT)", async () => {
      const fs = (await import("fs/promises")).default;
      const err = new Error("File not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fs.readFile).mockRejectedValue(err);

      const { GET } = await import("@/app/api/board/route");
      const response = await GET();
      const data = await response.json();

      expect(data).toBeNull();
    });

    it("returns 500 on other errors", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.readFile).mockRejectedValue(new Error("Disk failure"));

      const { GET } = await import("@/app/api/board/route");
      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to read board");
    });
  });

  describe("PUT", () => {
    it("creates data dir and writes board file", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const boardData = { id: "b1", columns: [] };
      const request = new Request("http://localhost/api/board", {
        method: "PUT",
        body: JSON.stringify(boardData),
        headers: { "Content-Type": "application/json" },
      });

      const { PUT } = await import("@/app/api/board/route");
      const response = await PUT(request);
      const data = await response.json();

      expect(data).toEqual({ ok: true });
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("data"), {
        recursive: true,
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("board.json"),
        JSON.stringify(boardData, null, 2),
        "utf-8"
      );
    });

    it("returns 500 on write failure", async () => {
      const fs = (await import("fs/promises")).default;
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error("Write failed"));

      const request = new Request("http://localhost/api/board", {
        method: "PUT",
        body: JSON.stringify({ id: "b1", columns: [] }),
        headers: { "Content-Type": "application/json" },
      });

      const { PUT } = await import("@/app/api/board/route");
      const response = await PUT(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to save board");
    });
  });
});
