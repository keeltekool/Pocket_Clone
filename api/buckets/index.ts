import { db } from "../../lib/db";
import { buckets } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, asc } from "drizzle-orm";


export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const userId = await getUserId(req);
  if (!userId) return unauthorized(res);

  if (req.method === "GET") {
    try {
      const data = await db
        .select()
        .from(buckets)
        .where(eq(buckets.userId, userId))
        .orderBy(asc(buckets.name));

      return res.status(200).json({ buckets: data });
    } catch (error) {
      console.error("Failed to load buckets:", error);
      return res.status(500).json({ error: "Failed to load buckets" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name } = req.body;
      const trimmedName = name?.trim();
      if (!trimmedName) return badRequest(res, "Bucket name is required");

      const [newBucket] = await db
        .insert(buckets)
        .values({ userId, name: trimmedName })
        .returning();

      return res.status(201).json({ bucket: newBucket });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "A bucket with this name already exists" });
      }
      console.error("Failed to create bucket:", error);
      return res.status(500).json({ error: "Failed to create bucket" });
    }
  }

  return methodNotAllowed(res);
}
