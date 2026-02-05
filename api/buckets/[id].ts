import { db } from "../../lib/db";
import { buckets } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, and } from "drizzle-orm";


export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const userId = await getUserId(req);
  if (!userId) return unauthorized(res);

  const id = req.query.id;
  if (!id) return badRequest(res, "Bucket ID is required");

  if (req.method === "PUT") {
    try {
      const { name } = req.body;
      const trimmedName = name?.trim();
      if (!trimmedName) return badRequest(res, "Bucket name is required");

      const [updated] = await db
        .update(buckets)
        .set({ name: trimmedName })
        .where(and(eq(buckets.id, id), eq(buckets.userId, userId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Bucket not found" });
      }

      return res.status(200).json({ bucket: updated });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "A bucket with this name already exists" });
      }
      console.error("Failed to rename bucket:", error);
      return res.status(500).json({ error: "Failed to rename bucket" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await db
        .delete(buckets)
        .where(and(eq(buckets.id, id), eq(buckets.userId, userId)));

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to delete bucket:", error);
      return res.status(500).json({ error: "Failed to delete bucket" });
    }
  }

  return methodNotAllowed(res);
}
