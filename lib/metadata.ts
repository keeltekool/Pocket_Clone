// Page title + preview image, fetched server-side (the public CORS proxy the browser used is dead).
// Any failure returns nulls; the caller keeps the URL as the title.
export async function fetchMeta(url: string): Promise<{ title: string | null; imageUrl: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PocketClone/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.body || !res.headers.get("content-type")?.includes("html")) {
      await res.body?.cancel();
      return { title: null, imageUrl: null }; // PDFs, images, downloads: keep the URL as the title
    }
    // Title and meta tags live in <head>: stop reading there (or at 500 KB) instead of downloading the page.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 500_000 && !html.includes("</head>")) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    const meta = (key: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"))?.[0].match(/content=(["'])(.*?)\1/i)?.[2];
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || meta("og:title");
    const image = meta("og:image") || meta("twitter:image");
    return {
      title: title ? decode(title).trim() || null : null,
      imageUrl: image ? new URL(decode(image), res.url).href : null,
    };
  } catch {
    return { title: null, imageUrl: null };
  }
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
