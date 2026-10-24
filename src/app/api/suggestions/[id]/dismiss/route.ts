import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bucketSuggestions } from "@/db/schema";
import { isUuid } from "@/lib/buckets";
import { notFound } from "@/lib/http";

// Dismiss (SPEC §3): the suggestion is hidden and its name is not suggested again (the agent sees it as dismissed).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const done = await db
    .update(bucketSuggestions)
    .set({ status: "dismissed" })
    .where(and(eq(bucketSuggestions.id, id), eq(bucketSuggestions.status, "open")))
    .returning({ id: bucketSuggestions.id });
  return done.length ? Response.json({ ok: true }) : notFound();
}
