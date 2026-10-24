import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

// Saved page text cap (SPEC §5); the Reader shows "The saved text ends here." at it.
export const MAX_TEXT = 60_000;
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

// First http(s) URL in free text (shared text from some iPhone apps wraps the link in words).
export function firstUrl(text: string): string | null {
  const m = String(text).match(/https?:\/\/[^\s<>"'`]+/i);
  if (!m) return null;
  let candidate = m[0].replace(/[.,;:!?]+$/, "");
  // A closing bracket is part of the link when it balances one inside it (Wikipedia's `Bookmark_(digital)`),
  // and surrounding text when it does not (`(see https://a.ee/x)`).
  const count = (s: string, ch: string) => s.split(ch).length - 1;
  while (/[)\]]$/.test(candidate) && count(candidate, candidate.endsWith(")") ? ")" : "]") > count(candidate, candidate.endsWith(")") ? "(" : "["))
    candidate = candidate.slice(0, -1).replace(/[.,;:!?]+$/, "");
  try {
    return new URL(candidate).href;
  } catch {
    return null;
  }
}

type PageData = { title: string | null; imageUrl: string | null; text: string | null };
const NONE: PageData = { title: null, imageUrl: null, text: null };
const squash = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim() || null;

// Elements that end a paragraph. Everything else (a, b, span, em…) is inline and runs on within the paragraph.
const BLOCK = new Set(["ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "OL", "P", "PRE", "SECTION", "TABLE", "TD", "TH", "TR", "UL"]);

// Readable text with its paragraphs (SPEC §5, v2.1): one paragraph per block, whitespace inside collapsed, joined by a
// blank line, cut at MAX_TEXT. The Reader splits on the blank lines; the sorter, search and MCP read the same text.
export function paragraphs(root: Node): string | null {
  const parts = [""];
  const walk = (node: Node) => {
    if (node.nodeType === 3) parts[parts.length - 1] += node.textContent ?? "";
    if (node.nodeType !== 1) return;
    const block = BLOCK.has((node as Element).tagName.toUpperCase());
    if (block) parts.push("");
    for (const child of Array.from(node.childNodes)) walk(child);
    if (block) parts.push("");
  };
  walk(root);
  const text = parts.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");
  return text ? text.slice(0, MAX_TEXT).trimEnd() : null; // a cut between paragraphs leaves no trailing break
}

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
    // Older Estonian sites still serve windows-1257 / iso-8859-x; an unknown label falls back to UTF-8.
    const charset = /charset=["']?([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1];
    let decoder: TextDecoder;
    try {
      decoder = new TextDecoder(charset || "utf-8");
    } catch {
      decoder = new TextDecoder();
    }
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
    // Readability rewrites the document, so metadata is read first. Code and styles never count as page text.
    document.querySelectorAll("script, style, noscript, template").forEach((el) => el.remove());
    // The identity serializer hands back the article element (not an HTML string), so its blocks become paragraphs.
    const article = new Readability<Node>(document as unknown as Document, { charThreshold: 200, serializer: (el) => el }).parse();
    const text = (article?.content && paragraphs(article.content)) || (document.body && paragraphs(document.body as unknown as Node)) || null;
    return { title, imageUrl, text };
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
  // A full document: linkedom gives a fragment no <body>.
  const text = squash(parseHTML(`<html><body>${data.html || ""}</body></html>`).document.body?.textContent);
  return { title: data.author_name ? `${data.author_name} on X` : null, imageUrl: null, text };
}
