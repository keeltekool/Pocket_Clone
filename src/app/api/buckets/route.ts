import { db } from "@/db";
import { buckets } from "@/db/schema";
import { badRequest } from "@/lib/auth";
import { cleanName, conflict, duplicateName } from "@/lib/buckets";
import { bucketCounts } from "@/lib/items";

export async function GET() {
  return Response.json(await bucketCounts());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return badRequest("Bucket name is required");
  try {
    const [bucket] = await db.insert(buckets).values({ name }).returning({ id: buckets.id, name: buckets.name });
    return Response.json({ bucket: { ...bucket, count: 0 } }, { status: 201 });
  } catch (e) {
    if (duplicateName(e)) return conflict();
    throw e;
  }
}
