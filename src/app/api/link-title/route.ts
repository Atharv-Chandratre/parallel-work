import { NextResponse } from "next/server";

const MAX_BYTES = 64 * 1024; // 64KB — <head> with <title> fits well within this.
const FETCH_TIMEOUT_MS = 5000;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}

function extractTitle(html: string): string | null {
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  if (ogMatch) return decodeHtmlEntities(ogMatch[1]).trim();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) return decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
  return null;
}

// GitHub titles include trailing "· Pull Request #N · OWNER/REPO" / "· Issue #N · OWNER/REPO"
// noise. Strip it so the saved task title matches the PR/issue title alone.
function cleanGithubTitle(title: string): string {
  const pr = title.match(/^(.*?)(?:\s+by\s+[^·]+)?\s+·\s+Pull Request\s+#\d+\s+·\s+.+$/);
  if (pr) return pr[1].trim();
  const issue = title.match(/^(.*?)\s+·\s+Issue\s+#\d+\s+·\s+.+$/);
  if (issue) return issue[1].trim();
  return title;
}

type GithubRef = { owner: string; repo: string; kind: "pulls" | "issues"; num: string };

function parseGithubPullOrIssue(target: URL): GithubRef | null {
  if (target.hostname !== "github.com") return null;
  const m = target.pathname.match(/^\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/);
  if (!m) return null;
  return {
    owner: m[1],
    repo: m[2],
    kind: m[3] === "pull" ? "pulls" : "issues",
    num: m[4],
  };
}

// Try the GitHub REST API first for github.com PR/issue URLs. Works for
// private repos when GITHUB_TOKEN is set (recommended on Vercel) and for
// public repos either way (subject to anonymous rate limits).
async function fetchGithubApiTitle(ref: GithubRef, signal: AbortSignal): Promise<string | null> {
  const apiUrl = `https://api.github.com/repos/${ref.owner}/${ref.repo}/${ref.kind}/${ref.num}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "parallel-work-title-fetcher/1.0",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(apiUrl, { headers, signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim() ? data.title.trim() : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw) return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "unsupported protocol" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const githubRef = parseGithubPullOrIssue(target);
    if (githubRef) {
      const apiTitle = await fetchGithubApiTitle(githubRef, controller.signal);
      if (apiTitle) {
        return NextResponse.json({ ok: true, title: apiTitle });
      }
      // Fall through to HTML scrape (works for public repos without a token).
    }

    const res = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Identify as a browser-ish UA so sites like GitHub return useful HTML.
        "User-Agent":
          "Mozilla/5.0 (compatible; parallel-work-title-fetcher/1.0; +https://github.com/)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok || !res.body) {
      return NextResponse.json({ ok: false, error: `upstream ${res.status}` }, { status: 502 });
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    try {
      await reader.cancel();
    } catch {}
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      chunks.reduce<Uint8Array>((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length);
        merged.set(acc);
        merged.set(c, acc.length);
        return merged;
      }, new Uint8Array())
    );
    const rawTitle = extractTitle(html);
    if (!rawTitle) {
      return NextResponse.json({ ok: false, error: "no title found" }, { status: 404 });
    }
    const title = target.hostname === "github.com" ? cleanGithubTitle(rawTitle) : rawTitle;
    return NextResponse.json({ ok: true, title });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "fetch failed",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
