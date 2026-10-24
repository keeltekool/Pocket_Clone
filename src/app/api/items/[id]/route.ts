import { eq } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import { badRequest } from "@/lib/auth";
import { getCard } from "@/lib/items";

type Ctx = { params: Promise<{ id: string }> };
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

// Manual move (SPEC §6.6): the owner's choice is final, the agent never re-files an item with sortedBy = owner.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await req.json().catch(() => ({}));
  if (!("bucketId" in body) || (body.bucketId !== null && !isUuid(String(body.bucketId)))) return badRequest("bucketId required");
  const bucketId: string | null = body.bucketId;
  const [updated] = await db
    .update(items)
    .set({ bucketId, status: bucketId ? "sorted" : "unsorted", sortedBy: "owner", sortedAt: new Date() })
    .where(eq(items.id, id))
    .returning({ id: items.id });
  if (!updated) return notFound();
  return Response.json({ item: await getCard(eq(items.id, id)) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const deleted = await db.delete(items).where(eq(items.id, id)).returning({ id: items.id });
  return deleted.length ? Response.json({ ok: true }) : notFound();
}
