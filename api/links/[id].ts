import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, and } from "drizzle-orm";


export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const userId = await getUserId(req);
  if (!userId) return unauthorized(res);

  const id = req.query.id;
  if (!id) return badRequest(res, "Link ID is required");

  if (req.method === "PUT") {
    try {
      const { bucketId } = req.body;

      const [updated] = await db
        .update(links)
        .set({ bucketId: bucketId || null })
        .where(and(eq(links.id, id), eq(links.userId, userId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Link not found" });
      }

      return res.status(200).json({ link: updated });
    } catch (error) {
      console.error("Failed to update link:", error);
      return res.status(500).json({ error: "Failed to update link" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await db
        .delete(links)
        .where(and(eq(links.id, id), eq(links.userId, userId)));

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to delete link:", error);
      return res.status(500).json({ error: "Failed to delete link" });
    }
  }

  return methodNotAllowed(res);
}
