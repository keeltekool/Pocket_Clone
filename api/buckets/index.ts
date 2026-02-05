import { db } from "../../lib/db";
import { buckets } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, asc } from "drizzle-orm";


export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  if (req.method === "GET") {
    try {
      const data = await db
        .select()
        .from(buckets)
        .where(eq(buckets.userId, userId))
        .orderBy(asc(buckets.name));

      return Response.json({ buckets: data });
    } catch (error) {
      console.error("Failed to load buckets:", error);
      return Response.json({ error: "Failed to load buckets" }, { status: 500 });
    }
  }

  if (req.method === "POST") {
    try {
      const { name } = await req.json();
      const trimmedName = name?.trim();
      if (!trimmedName) return badRequest("Bucket name is required");

      const [newBucket] = await db
        .insert(buckets)
        .values({ userId, name: trimmedName })
        .returning();

      return Response.json({ bucket: newBucket }, { status: 201 });
    } catch (error: any) {
      if (error?.code === "23505") {
        return Response.json({ error: "A bucket with this name already exists" }, { status: 409 });
      }
      console.error("Failed to create bucket:", error);
      return Response.json({ error: "Failed to create bucket" }, { status: 500 });
    }
  }

  return methodNotAllowed();
}
