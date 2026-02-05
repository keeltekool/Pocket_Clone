import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { methodNotAllowed, badRequest } from "../../lib/auth";


export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") return methodNotAllowed(res);

  // Authenticate via API key (for iOS shortcut)
  const apiKey = req.headers["x-api-key"];
  const userId = req.headers["x-user-id"];

  if (!apiKey || apiKey !== process.env.SHORTCUT_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  if (!userId) return badRequest(res, "X-User-Id header is required");

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

    return res.status(201).json({ success: true, link: newLink });
  } catch (error) {
    console.error("Failed to save link:", error);
    return res.status(500).json({ error: "Failed to save link" });
  }
}
