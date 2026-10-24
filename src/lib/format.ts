// Client-safe helpers shared by the UI, the API routes and the MCP server.

// `2 min ago`, `3 h ago`, `Oct 21`, `Oct 21, 2025` (SPEC §4.2).
export function timeAgo(iso: string | Date, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const s = Math.floor((now - t) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const d = new Date(t);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date(now).getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-US", opts);
}

export const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

// The one label rule for where a link is: `Sorting…`, its bucket name, or `Unsorted`.
export const bucketLabel = (status: "sorting" | "sorted" | "unsorted", bucketName: string | null | undefined) =>
  status === "sorting" ? "Sorting…" : (bucketName ?? "Unsorted");
