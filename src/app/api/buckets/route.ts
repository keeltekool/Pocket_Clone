import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bucketSuggestions, buckets } from "@/db/schema";
import { badRequest } from "@/lib/auth";
import { cleanName, conflict, duplicateName, isUuid } from "@/lib/buckets";
import { bucketCounts } from "@/lib/items";
import { dispatchBucketCreated } from "@/lib/sorter";

export const maxDuration = 30;

export async function GET() {
  return Response.json(await bucketCounts());
}

// Create (SPEC §6.5): from a suggestion (marked `created`) or from + New bucket; either way the agent then moves the
// Unsorted links that belong in it.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return badRequest("Bucket name is required");
  let bucket: { id: string; name: string };
  try {
    [bucket] = await db.insert(buckets).values({ name }).returning({ id: buckets.id, name: buckets.name });
  } catch (e) {
    if (duplicateName(e)) return conflict();
    throw e;
  }
  if (isUuid(body.suggestionId)) {
    await db.update(bucketSuggestions).set({ status: "created" }).where(eq(bucketSuggestions.id, body.suggestionId));
  }
  await dispatchBucketCreated(bucket.name);
  return Response.json({ bucket: { ...bucket, count: 0 } }, { status: 201 });
}
