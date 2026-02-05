import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, desc } from "drizzle-orm";


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
        .from(links)
        .where(eq(links.userId, userId))
        .orderBy(desc(links.createdAt));

      return Response.json({ links: data });
    } catch (error) {
      console.error("Failed to load links:", error);
      return Response.json({ error: "Failed to load links" }, { status: 500 });
    }
  }

  if (req.method === "POST") {
    try {
      const { url, title, imageUrl, domain } = await req.json();
      if (!url) return badRequest("URL is required");

      const [newLink] = await db
        .insert(links)
        .values({
          userId,
          url,
          title: title || null,
          imageUrl: imageUrl || null,
          domain: domain || null,
          bucketId: null,
        })
        .returning();

      return Response.json({ link: newLink }, { status: 201 });
    } catch (error) {
      console.error("Failed to create link:", error);
      return Response.json({ error: "Failed to create link" }, { status: 500 });
    }
  }

  return methodNotAllowed();
}
