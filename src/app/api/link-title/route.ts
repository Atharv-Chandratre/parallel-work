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
    const title = extractTitle(html);
    if (!title) {
      return NextResponse.json({ ok: false, error: "no title found" }, { status: 404 });
    }
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
