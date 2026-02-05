import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, desc } from "drizzle-orm";


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
        .from(links)
        .where(eq(links.userId, userId))
        .orderBy(desc(links.createdAt));

      return res.status(200).json({ links: data });
    } catch (error) {
      console.error("Failed to load links:", error);
      return res.status(500).json({ error: "Failed to load links" });
    }
  }

  if (req.method === "POST") {
    try {
      const { url, title, imageUrl, domain } = req.body;
      if (!url) return badRequest(res, "URL is required");

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

      return res.status(201).json({ link: newLink });
    } catch (error) {
      console.error("Failed to create link:", error);
      return res.status(500).json({ error: "Failed to create link" });
    }
  }

  return methodNotAllowed(res);
}
