import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

function makeRequest(url: string): Request {
  return new Request(`http://localhost/api/link-title?url=${encodeURIComponent(url)}`);
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("GET /api/link-title", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when url is missing", async () => {
    const req = new Request("http://localhost/api/link-title");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-http(s) URLs", async () => {
    const res = await GET(makeRequest("ftp://example.com/file"));
    expect(res.status).toBe(400);
  });

  it("extracts the <title> from an HTML page", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(htmlResponse("<html><head><title>Hello World</title></head></html>"));
    const res = await GET(makeRequest("https://example.com/doc"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.title).toBe("Hello World");
  });

  it("prefers og:title when present", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        htmlResponse(
          `<html><head><meta property="og:title" content="The OG Title"><title>Fallback</title></head></html>`
        )
      );
    const res = await GET(makeRequest("https://example.com/"));
    const body = await res.json();
    expect(body.title).toBe("The OG Title");
  });

  it("decodes HTML entities in the title", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(htmlResponse("<html><head><title>Foo &amp; Bar</title></head></html>"));
    const res = await GET(makeRequest("https://example.com/"));
    const body = await res.json();
    expect(body.title).toBe("Foo & Bar");
  });

  it("returns 404 if no title found", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(htmlResponse("<html><body>no title</body></html>"));
    const res = await GET(makeRequest("https://example.com/"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 502 on upstream error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    const res = await GET(makeRequest("https://example.com/"));
    expect(res.status).toBe(502);
  });

  it("strips Pull Request suffix for github.com URLs", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        htmlResponse(
          `<html><head><meta property="og:title" content="Add task scheduling: due dates + calendar view by Atharv-Chandratre · Pull Request #1 · Atharv-Chandratre/parallel-work"></head></html>`
        )
      );
    const res = await GET(makeRequest("https://github.com/Atharv-Chandratre/parallel-work/pull/1"));
    const body = await res.json();
    expect(body.title).toBe("Add task scheduling: due dates + calendar view");
  });

  it("strips Issue suffix for github.com URLs", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        htmlResponse(
          `<html><head><meta property="og:title" content="Login bug repro · Issue #42 · acme/widgets"></head></html>`
        )
      );
    const res = await GET(makeRequest("https://github.com/acme/widgets/issues/42"));
    const body = await res.json();
    expect(body.title).toBe("Login bug repro");
  });

  it("leaves non-github titles untouched even when they contain · Pull Request", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        htmlResponse(`<html><head><title>Random · Pull Request #1 · foo/bar</title></head></html>`)
      );
    const res = await GET(makeRequest("https://example.com/page"));
    const body = await res.json();
    expect(body.title).toBe("Random · Pull Request #1 · foo/bar");
  });
});
