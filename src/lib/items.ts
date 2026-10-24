import { and, desc, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { buckets, items } from "@/db/schema";
import { isUuid } from "@/lib/buckets";
import { domainOf, fetchPage, firstUrl, normalizeUrl } from "@/lib/page";
import { dispatchSort } from "@/lib/sorter";

// What the UI and MCP list endpoints return per link (SPEC §4.2): no page text.
const cardColumns = {
  id: items.id,
  number: items.number,
  url: items.url,
  title: items.title,
  domain: items.domain,
  imageUrl: items.imageUrl,
  status: items.status,
  sortedBy: items.sortedBy,
  createdAt: items.createdAt,
  bucketId: items.bucketId,
  bucketName: buckets.name,
};
const cards = () => db.select(cardColumns).from(items).leftJoin(buckets, eq(items.bucketId, buckets.id));
type Row = Awaited<ReturnType<typeof cards>>[number];
export type Card = Omit<Row, "bucketId" | "bucketName"> & { bucket: { id: string; name: string } | null };

const toCard = ({ bucketId, bucketName, ...rest }: Row): Card => ({
  ...rest,
  bucket: bucketId && bucketName ? { id: bucketId, name: bucketName } : null,
});

export type ListFilter = { bucket?: string | null; q?: string | null; changedSince?: string | null; limit?: number };

// Newest first. `bucket` is a bucket id or "unsorted"; `q` matches title, domain, URL and page text;
// `changedSince` returns links created or (re)sorted after that instant (the Sorting… poll).
// ponytail: ILIKE scans are fine for a few hundred rows; add a trigram/FTS index past ~5,000 items.
export async function listItems(f: ListFilter = {}): Promise<Card[]> {
  const where: SQL[] = [];
  if (f.bucket === "unsorted") where.push(eq(items.status, "unsorted"));
  else if (f.bucket) where.push(isUuid(f.bucket) ? eq(items.bucketId, f.bucket) : sql`false`);
  if (f.q) {
    const needle = `%${f.q}%`;
    where.push(or(ilike(items.title, needle), ilike(items.domain, needle), ilike(items.url, needle), ilike(items.pageText, needle))!);
  }
  if (f.changedSince) {
    const since = new Date(f.changedSince);
    if (!Number.isNaN(since.getTime())) where.push(or(gt(items.createdAt, since), gt(items.sortedAt, since))!);
  }
  const q = cards().where(where.length ? and(...where) : undefined).orderBy(desc(items.createdAt), desc(items.number));
  const rows = f.limit ? await q.limit(f.limit) : await q;
  return rows.map(toCard);
}

export async function getCard(where: SQL): Promise<Card | null> {
  const [row] = await cards().where(where).limit(1);
  return row ? toCard(row) : null;
}

export class NotALink extends Error {}

// The one save pipeline (SPEC §6.1), shared by the app box, the bookmarklet and the iPhone Shortcut.
// Duplicate (same normalised URL) → the existing card. New → page fetched first (8 s cap) so the sorter has the text,
// then the sorting agent is dispatched and the card comes back as `sorting`.
export async function saveLink(input: string): Promise<{ item: Card; duplicate: boolean }> {
  const url = firstUrl(input);
  if (!url) throw new NotALink("That doesn't look like a link.");
  const urlKey = normalizeUrl(url);

  const existing = await getCard(eq(items.urlKey, urlKey));
  if (existing) return { item: existing, duplicate: true };

  const page = await fetchPage(url);
  const [inserted] = await db
    .insert(items)
    .values({
      url,
      urlKey,
      title: page.title ?? url,
      domain: domainOf(url),
      imageUrl: page.imageUrl,
      pageText: page.text,
      status: "sorting",
    })
    .onConflictDoNothing({ target: items.urlKey })
    .returning({ id: items.id, number: items.number });
  // Two saves of the same link at once: the unique url_key makes the second a duplicate (SPEC §6.10).
  if (!inserted) return { item: (await getCard(eq(items.urlKey, urlKey)))!, duplicate: true };
  await dispatchSort(inserted.number);
  return { item: (await getCard(eq(items.id, inserted.id)))!, duplicate: false };
}

// Sidebar counts (SPEC §8 GET /api/buckets): buckets in seed order with their counts, plus Unsorted and All.
export async function bucketCounts() {
  const rows = await db
    .select({ id: buckets.id, name: buckets.name, count: sql<number>`count(${items.id})::int` })
    .from(buckets)
    .leftJoin(items, eq(items.bucketId, buckets.id))
    .groupBy(buckets.id)
    .orderBy(buckets.createdAt);
  const [{ unsortedCount, total }] = await db
    .select({
      unsortedCount: sql<number>`count(*) filter (where ${items.status} = 'unsorted')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(items);
  return { buckets: rows, unsortedCount, total };
}
