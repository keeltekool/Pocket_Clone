import { createHash, timingSafeEqual } from "node:crypto";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { db } from "@/db";
import { bucketSuggestions, buckets, items } from "@/db/schema";
import { normalizeUrl } from "@/lib/page";
import { listItems, type Card } from "@/lib/items";

export const maxDuration = 60;

// MCP server "pocket" (SPEC §8): used by Claude Code (`pocket #58`) and by the sorting agent. Bearer MCP_TOKEN.
const text = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }] });
const fail = (error: string, extra: Record<string, unknown> = {}) => ({ ...text({ error, ...extra }), isError: true });
const compact = (c: Card) => ({
  number: c.number,
  title: c.title,
  domain: c.domain,
  bucket: c.status === "sorting" ? "Sorting…" : (c.bucket?.name ?? "Unsorted"),
  savedAt: c.createdAt,
});

// "58", "#58" → by number; a URL → by its normalised key.
async function findItem(ref: string) {
  const n = ref.trim().match(/^#?(\d+)$/);
  const where = n ? eq(items.number, Number(n[1])) : /^https?:\/\//i.test(ref) ? eq(items.urlKey, normalizeUrl(ref.trim())) : null;
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
          "Full record of one saved link in the owner's Pocket Clone: number, title, URL, domain, bucket, status, sortedBy, savedAt and the page text. `item` is a number (\"58\" or \"#58\") or the link's URL. The page text is cut at `maxChars` (default 60000).",
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
          bucket: i.status === "sorting" ? "Sorting…" : (row.bucketName ?? "Unsorted"),
          status: i.status,
          sortedBy: i.sortedBy,
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
        description: "Newest-first list of the owner's saved links, optionally one bucket (`bucket` = bucket name or \"unsorted\"). Compact rows.",
        inputSchema: z.object({ bucket: z.string().optional(), limit: z.number().int().min(1).max(300).optional() }),
      },
      async ({ bucket, limit }) => {
        let filter: string | undefined;
        if (bucket && bucket.toLowerCase() !== "unsorted") {
          const b = await bucketByName(bucket);
          if (!b) return fail("no_such_bucket", { bucket });
          filter = b.id;
        } else if (bucket) filter = "unsorted";
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
        const all = await db.select().from(buckets).orderBy(buckets.createdAt);
        const rows = await Promise.all(
          all.map(async (b) => {
            const recent = await db.select({ title: items.title }).from(items).where(eq(items.bucketId, b.id)).orderBy(desc(items.createdAt)).limit(10);
            const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(items).where(eq(items.bucketId, b.id));
            return { name: b.name, count, recentTitles: recent.map((r) => r.title) };
          }),
        );
        const [{ unsortedCount }] = await db.select({ unsortedCount: sql<number>`count(*)::int` }).from(items).where(eq(items.status, "unsorted"));
        const suggestions = await db
          .select({ name: bucketSuggestions.name, status: bucketSuggestions.status })
          .from(bucketSuggestions)
          .where(or(eq(bucketSuggestions.status, "open"), eq(bucketSuggestions.status, "dismissed")));
        return text({
          buckets: rows,
          unsortedCount,
          suggestions: {
            open: suggestions.filter((s) => s.status === "open").map((s) => s.name),
            dismissed: suggestions.filter((s) => s.status === "dismissed").map((s) => s.name),
          },
        });
      },
    );

    server.registerTool(
      "pocket_file_item",
      {
        title: "File a link into a bucket",
        description: "Move link `number` into `bucket` (an existing bucket name, or \"unsorted\" when nothing fits). Refused when the owner filed the link by hand (sortedBy = owner). Never creates buckets.",
        inputSchema: z.object({ number: z.number().int().positive(), bucket: z.string().min(1) }),
      },
      async ({ number, bucket }) => {
        const [cur] = await db.select({ id: items.id, sortedBy: items.sortedBy }).from(items).where(eq(items.number, number)).limit(1);
        if (!cur) return fail("not_found", { number });
        if (cur.sortedBy === "owner") return fail("owner_filed", { number, hint: "The owner moved this link by hand; leave it." });
        let bucketId: string | null = null;
        if (bucket.trim().toLowerCase() !== "unsorted") {
          const b = await bucketByName(bucket);
          if (!b) return fail("no_such_bucket", { bucket, hint: "Use an existing bucket name exactly, or \"unsorted\"." });
          bucketId = b.id;
        }
        await db
          .update(items)
          .set({ bucketId, status: bucketId ? "sorted" : "unsorted", sortedBy: "agent", sortedAt: new Date() })
          .where(eq(items.id, cur.id));
        const row = await findItem(String(number));
        return text({ number, bucket: row?.bucketName ?? "Unsorted", status: row?.item.status });
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
const sha = (s: string) => createHash("sha256").update(s).digest();
function authorized(req: Request): boolean {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = process.env.MCP_TOKEN;
  return !!expected && !!token && timingSafeEqual(sha(token), sha(expected));
}
const guarded = (req: Request) => (authorized(req) ? handler(req) : Response.json({ error: "Unauthorized" }, { status: 401 }));

export { guarded as GET, guarded as POST };
