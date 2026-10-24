import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

const MAX_TEXT = 60_000;
const MAX_HTML = 2_000_000;
const TIMEOUT_MS = 8_000;
const TRACKING = /^(utm_|mc_)|^(fbclid|gclid)$/;

// Duplicate key (SPEC §5): lowercase host without www., no fragment, no tracking params, no trailing slash, no scheme.
export function normalizeUrl(url: string): string {
  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key);
  const path = u.pathname.replace(/\/+$/, "");
  const query = u.searchParams.toString();
  return `${host}${path}${query ? `?${query}` : ""}`;
}

export const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

// First http(s) URL in free text (shared text from some iPhone apps wraps the link in words).
export function firstUrl(text: string): string | null {
  const m = String(text).match(/https?:\/\/[^\s<>"'`]+/i);
  if (!m) return null;
  const candidate = m[0].replace(/[.,;:!?)\]]+$/, "");
  try {
    return new URL(candidate).href;
  } catch {
    return null;
  }
}

export type PageData = { title: string | null; imageUrl: string | null; text: string | null };
const NONE: PageData = { title: null, imageUrl: null, text: null };
const squash = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim() || null;

// Title, preview image and readable text, fetched server-side. Any failure returns nulls; the caller keeps the URL
// as the title and the agent sorts on what it has (SPEC §6.1, §6.10).
export async function fetchPage(url: string): Promise<PageData> {
  try {
    if (/^(www\.)?(x|twitter)\.com$/i.test(new URL(url).hostname)) return await fetchTweet(url);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PocketClone/2.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("html")) {
      await res.body?.cancel();
      return NONE; // PDFs, images, downloads: keep the URL as the title
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < MAX_HTML) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => {});

    const { document } = parseHTML(html);
    const meta = (key: string) =>
      document.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute("content") || null;
    const title = squash(document.querySelector("title")?.textContent) || squash(meta("og:title"));
    const image = meta("og:image") || meta("twitter:image");
    let imageUrl: string | null = null;
    try {
      imageUrl = image ? new URL(image, res.url).href : null;
    } catch {}
    // Readability rewrites the document, so metadata is read first.
    const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse();
    const text = squash(article?.textContent) || squash(document.body?.textContent)?.slice(0, MAX_TEXT) || null;
    return { title, imageUrl, text: text ? text.slice(0, MAX_TEXT) : null };
  } catch {
    return NONE;
  }
}

// x.com gives no HTML to bots; the public oEmbed endpoint returns the post text (SPEC §6.10).
async function fetchTweet(url: string): Promise<PageData> {
  const res = await fetch(`https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return NONE;
  const data = (await res.json()) as { author_name?: string; html?: string };
  const text = squash(parseHTML(`<div>${data.html || ""}</div>`).document.body?.textContent);
  return { title: data.author_name ? `${data.author_name} on X` : null, imageUrl: null, text };
}
