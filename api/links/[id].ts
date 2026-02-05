import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, and } from "drizzle-orm";


export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) return badRequest("Link ID is required");

  if (req.method === "PUT") {
    try {
      const body = await req.json();
      const { bucketId } = body;

      const [updated] = await db
        .update(links)
        .set({ bucketId: bucketId || null })
        .where(and(eq(links.id, id), eq(links.userId, userId)))
        .returning();

      if (!updated) {
        return Response.json({ error: "Link not found" }, { status: 404 });
      }

      return Response.json({ link: updated });
    } catch (error) {
      console.error("Failed to update link:", error);
      return Response.json({ error: "Failed to update link" }, { status: 500 });
    }
  }

  if (req.method === "DELETE") {
    try {
      await db
        .delete(links)
        .where(and(eq(links.id, id), eq(links.userId, userId)));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Failed to delete link:", error);
      return Response.json({ error: "Failed to delete link" }, { status: 500 });
    }
  }

  return methodNotAllowed();
}
