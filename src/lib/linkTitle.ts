/**
 * Client-side helper: ask the server's /api/link-title endpoint to fetch the
 * given URL and extract its <title> / og:title. Returns the string on
 * success, or null if the fetch failed / the page had no title.
 */
export async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/link-title?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; title?: string };
    return data.ok && data.title ? data.title : null;
  } catch {
    return null;
  }
}

export function looksLikeUrl(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  // Require an explicit scheme so plain text isn't misinterpreted as a URL.
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
