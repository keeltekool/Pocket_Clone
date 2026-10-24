import { eq, inArray, sql } from "drizzle-orm";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { db } from "@/db";
import { bucketSuggestions, buckets, items } from "@/db/schema";
import { secretMatches } from "@/lib/auth";
import { reservedName } from "@/lib/buckets";
import { bucketLabel } from "@/lib/format";
import { bucketCounts, fileItem, listItems, type Card } from "@/lib/items";
import { normalizeUrl } from "@/lib/page";
import { listOpenSuggestions } from "@/lib/suggestions";

export const maxDuration = 60;

// MCP server "pocket" (SPEC §8): used by Claude Code (`pocket #58`) and by the sorting agent. Bearer MCP_TOKEN.
const text = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }] });
const fail = (error: string, extra: Record<string, unknown> = {}) => ({ ...text({ error, ...extra }), isError: true });
const compact = (c: Card) => ({ number: c.number, title: c.title, domain: c.domain, bucket: bucketLabel(c.status, c.bucket?.name), savedAt: c.createdAt });

// "58", "#58" → by number; a URL → by its normalised key.
async function findItem(ref: string) {
  const n = ref.trim().match(/^#?(\d+)$/);
  let where = n ? eq(items.number, Number(n[1])) : null;
  if (!where && /^https?:\/\//i.test(ref)) {
    try {
      where = eq(items.urlKey, normalizeUrl(ref.trim()));
    } catch {
      return null; // malformed URL
    }
  }
  if (!where) return null;
  const [row] = await db
    .select({ item: items, bucketName: buckets.name })
    .from(items)
    .leftJoin(buckets, eq(items.bucketId, buckets.id))
    .where(where)
    .limit(1);
  return row ?? null;
}

async function bucketByName(name: string) {
  const [b] = await db.select().from(buckets).where(sql`lower(${buckets.name}) = lower(${name.trim()})`).limit(1);
  return b ?? null;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "pocket_get_item",
      {
        title: "Get a saved link",
        description:
          "Full record of one saved link in the owner's Pocket Clone: number, title, URL, domain, bucket, status, sortedBy, favourite (the owner's heart), savedAt and the page text. `item` is a number (\"58\" or \"#58\") or the link's URL. The page text is cut at `maxChars` (default 60000).",
        inputSchema: z.object({ item: z.string(), maxChars: z.number().int().min(100).max(60_000).optional() }),
      },
      async ({ item, maxChars }) => {
        const row = await findItem(item);
        if (!row) return fail("not_found", { item });
        const i = row.item;
        return text({
          number: i.number,
          title: i.title,
          url: i.url,
          domain: i.domain,
          bucket: bucketLabel(i.status, row.bucketName),
          status: i.status,
          sortedBy: i.sortedBy,
          favourite: i.favourite,
          savedAt: i.createdAt,
          pageText: i.pageText ? i.pageText.slice(0, maxChars ?? 60_000) : null,
        });
      },
    );

    server.registerTool(
      "pocket_search",
      {
        title: "Search saved links",
        description: "Case-insensitive search over title, domain, URL and page text of the owner's saved links. Compact rows; full record via pocket_get_item.",
        inputSchema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(100).optional() }),
      },
      async ({ query, limit }) => text({ items: (await listItems({ q: query, limit: limit ?? 20 })).map(compact) }),
    );

    server.registerTool(
      "pocket_list",
      {
        title: "List saved links",
        description: "Newest-first list of the owner's saved links, optionally one bucket (`bucket` = bucket name, \"unsorted\", or \"favourites\" for the links the owner hearted). Compact rows.",
        inputSchema: z.object({ bucket: z.string().optional(), limit: z.number().int().min(1).max(300).optional() }),
      },
      async ({ bucket, limit }) => {
        let filter: string | undefined;
        const keyword = bucket?.trim().toLowerCase();
        if (keyword === "unsorted" || keyword === "favourites") filter = keyword;
        else if (bucket) {
          const b = await bucketByName(bucket);
          if (!b) return fail("no_such_bucket", { bucket });
          filter = b.id;
        }
        return text({ items: (await listItems({ bucket: filter, limit: limit ?? 50 })).map(compact) });
      },
    );

    server.registerTool(
      "pocket_list_buckets",
      {
        title: "List buckets",
        description: "Every bucket with its link count and its 10 most recent titles, the Unsorted count, and the names of open and dismissed bucket suggestions.",
        inputSchema: z.object({}),
      },
      async () => {
        // Four round trips in parallel: counts, the 10 newest titles per bucket in one window query, suggestions.
        const ranked = db
          .select({ bucketId: items.bucketId, title: items.title, rn: sql<number>`row_number() over (partition by ${items.bucketId} order by ${items.createdAt} desc)`.as("rn") })
          .from(items)
          .where(sql`${items.bucketId} is not null`)
          .as("ranked");
        const [counts, recent, open, dismissed] = await Promise.all([
          bucketCounts(),
          db.select({ bucketId: ranked.bucketId, title: ranked.title }).from(ranked).where(sql`${ranked.rn} <= 10`).orderBy(ranked.rn),
          listOpenSuggestions(),
          db.select({ name: bucketSuggestions.name }).from(bucketSuggestions).where(eq(bucketSuggestions.status, "dismissed")),
        ]);
        return text({
          buckets: counts.buckets.map((b) => ({ name: b.name, count: b.count, recentTitles: recent.filter((r) => r.bucketId === b.id).map((r) => r.title) })),
          unsortedCount: counts.unsortedCount,
          suggestions: { open: open.map((s) => s.name), dismissed: dismissed.map((s) => s.name) },
        });
      },
    );

    server.registerTool(
      "pocket_file_item",
      {
        title: "File a link into a bucket",
        description: "Move link `number` into `bucket` (an existing bucket name, or \"unsorted\" when nothing fits). Refused when the owner filed the link by hand (sortedBy = owner) or the link is already in a bucket. Never creates buckets.",
        inputSchema: z.object({ number: z.number().int().positive(), bucket: z.string().min(1) }),
      },
      async ({ number, bucket }) => {
        const unsorted = bucket.trim().toLowerCase() === "unsorted";
        const [cur, target] = await Promise.all([
          db.select({ id: items.id, sortedBy: items.sortedBy, status: items.status }).from(items).where(eq(items.number, number)).limit(1).then((r) => r[0]),
          unsorted ? null : bucketByName(bucket),
        ]);
        if (!cur) return fail("not_found", { number });
        if (cur.sortedBy === "owner") return fail("owner_filed", { number, hint: "The owner moved this link by hand; leave it." });
        if (cur.status === "sorted") return fail("already_filed", { number, hint: "This link is already in a bucket; leave it." });
        if (!unsorted && !target) return fail("no_such_bucket", { bucket, hint: "Use an existing bucket name exactly, or \"unsorted\"." });
        // The same guards sit in the UPDATE's WHERE: a move the owner makes between the check and the write wins.
        if (!(await fileItem(cur.id, target?.id ?? null, "agent"))) return fail("owner_filed", { number, hint: "The owner moved this link by hand; leave it." });
        return text({ number, bucket: target?.name ?? "Unsorted", status: target ? "sorted" : "unsorted" });
      },
    );

    server.registerTool(
      "pocket_suggest_bucket",
      {
        title: "Suggest a new bucket",
        description: "Propose a bucket the owner could create for Unsorted links that share a topic no bucket covers. The owner decides; nothing moves. Skip names already open or dismissed.",
        inputSchema: z.object({
          name: z.string().trim().min(2).max(60),
          reason: z.string().trim().min(5).max(300),
          itemNumbers: z.array(z.number().int().positive()).min(1).max(50),
        }),
      },
      async ({ name, reason, itemNumbers }) => {
        if (reservedName(name)) return fail("reserved_name", { name, hint: "Unsorted and Favourites are views, not buckets." });
        const known = await db.select({ number: items.number }).from(items).where(inArray(items.number, itemNumbers));
        const numbers = known.map((k) => k.number);
        if (!numbers.length) return fail("no_such_items", { itemNumbers });
        const dup = await db
          .select({ id: bucketSuggestions.id })
          .from(bucketSuggestions)
          .where(sql`lower(${bucketSuggestions.name}) = lower(${name}) and ${bucketSuggestions.status} in ('open', 'dismissed')`)
          .limit(1);
        if (dup.length) return fail("already_suggested", { name });
        if (await bucketByName(name)) return fail("bucket_exists", { name });
        const [s] = await db.insert(bucketSuggestions).values({ name, reason, itemNumbers: numbers }).returning({ id: bucketSuggestions.id });
        return text({ suggestionId: s.id, name, itemNumbers: numbers });
      },
    );
  },
  { serverInfo: { name: "pocket", version: "2.0.0" } },
);

// Bearer check before the handler: the token is the only credential (Claude Code config + the agent's vault).
const guarded = (req: Request) =>
  secretMatches(req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""), process.env.MCP_TOKEN) ? handler(req) : Response.json({ error: "Unauthorized" }, { status: 401 });

export { guarded as GET, guarded as POST };
