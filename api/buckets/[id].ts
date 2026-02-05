import { db } from "../../lib/db";
import { buckets } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, and } from "drizzle-orm";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) return badRequest("Bucket ID is required");

  if (req.method === "PUT") {
    try {
      const { name } = await req.json();
      const trimmedName = name?.trim();
      if (!trimmedName) return badRequest("Bucket name is required");

      const [updated] = await db
        .update(buckets)
        .set({ name: trimmedName })
        .where(and(eq(buckets.id, id), eq(buckets.userId, userId)))
        .returning();

      if (!updated) {
        return Response.json({ error: "Bucket not found" }, { status: 404 });
      }

      return Response.json({ bucket: updated });
    } catch (error: any) {
      if (error?.code === "23505") {
        return Response.json({ error: "A bucket with this name already exists" }, { status: 409 });
      }
      console.error("Failed to rename bucket:", error);
      return Response.json({ error: "Failed to rename bucket" }, { status: 500 });
    }
  }

  if (req.method === "DELETE") {
    try {
      await db
        .delete(buckets)
        .where(and(eq(buckets.id, id), eq(buckets.userId, userId)));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Failed to delete bucket:", error);
      return Response.json({ error: "Failed to delete bucket" }, { status: 500 });
    }
  }

  return methodNotAllowed();
}
