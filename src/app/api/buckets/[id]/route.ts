import { eq } from "drizzle-orm";
import { db } from "@/db";
import { buckets, items } from "@/db/schema";
import { cleanName, duplicateName, isUuid, reservedName } from "@/lib/buckets";
import { badRequest, conflict, notFound } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return badRequest("Bucket name is required");
  if (reservedName(name)) return badRequest("That name is reserved.");
  try {
    const [bucket] = await db.update(buckets).set({ name }).where(eq(buckets.id, id)).returning({ id: buckets.id, name: buckets.name });
    return bucket ? Response.json({ bucket }) : notFound();
  } catch (e) {
    if (duplicateName(e)) return conflict();
    throw e;
  }
}

// Delete bucket (SPEC §6.7): its links become Unsorted and stay there; no automatic re-sort. sortedAt is bumped so an
// open page's changedSince poll picks the change up.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const [, deleted] = await db.batch([
    db.update(items).set({ bucketId: null, status: "unsorted", sortedAt: new Date() }).where(eq(items.bucketId, id)),
    db.delete(buckets).where(eq(buckets.id, id)).returning({ id: buckets.id }),
  ]);
  return deleted.length ? Response.json({ ok: true }) : notFound();
}
