import { eq } from "drizzle-orm";
import { db } from "@/db";
import { buckets, items } from "@/db/schema";
import { badRequest } from "@/lib/auth";
import { cleanName, conflict, duplicateName } from "@/lib/buckets";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return badRequest("Bucket name is required");
  try {
    const [bucket] = await db.update(buckets).set({ name }).where(eq(buckets.id, id)).returning({ id: buckets.id, name: buckets.name });
    return bucket ? Response.json({ bucket }) : notFound();
  } catch (e) {
    if (duplicateName(e)) return conflict();
    throw e;
  }
}

// Delete bucket (SPEC §6.7): its links become Unsorted and stay there; no automatic re-sort.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const [, deleted] = await db.batch([
    db.update(items).set({ bucketId: null, status: "unsorted" }).where(eq(items.bucketId, id)),
    db.delete(buckets).where(eq(buckets.id, id)).returning({ id: buckets.id }),
  ]);
  return deleted.length ? Response.json({ ok: true }) : notFound();
}
