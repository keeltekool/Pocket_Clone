import { eq } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import { isUuid, pgCode } from "@/lib/buckets";
import { badRequest, notFound } from "@/lib/http";
import { fileItem, getCard, setFavourite } from "@/lib/items";

type Ctx = { params: Promise<{ id: string }> };

// Manual move (SPEC §6.6): the owner's choice is final, the agent never re-files an item with sortedBy = owner.
// Or the heart (§6.6a): `{ favourite: boolean }`, nothing else changes. Exactly one of the two per request.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await req.json().catch(() => ({}));
  const move = "bucketId" in body;
  if (move === ("favourite" in body)) return badRequest("bucketId or favourite required");
  if (!move) {
    if (typeof body.favourite !== "boolean") return badRequest("favourite must be true or false");
    if (!(await setFavourite(id, body.favourite))) return notFound();
    return Response.json({ item: await getCard(eq(items.id, id)) });
  }
  if (body.bucketId !== null && !isUuid(body.bucketId)) return badRequest("bucketId required");
  try {
    if (!(await fileItem(id, body.bucketId, "owner"))) return notFound();
  } catch (e) {
    if (pgCode(e) === "23503") return badRequest("No such bucket"); // foreign_key_violation
    throw e;
  }
  return Response.json({ item: await getCard(eq(items.id, id)) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const deleted = await db.delete(items).where(eq(items.id, id)).returning({ id: items.id });
  return deleted.length ? Response.json({ ok: true }) : notFound();
}
