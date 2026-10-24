import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { methodNotAllowed, badRequest, OWNER } from "../../lib/auth";
import { fetchMeta } from "../../lib/metadata";


export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") return methodNotAllowed(res);

  // Authenticate via API key (for iOS shortcut)
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.SHORTCUT_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  try {
    const { url } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) return badRequest(res, "An http(s) URL is required");

    const meta = await fetchMeta(url);

    const [newLink] = await db
      .insert(links)
      .values({
        userId: OWNER,
        url,
        title: meta.title || url,
        imageUrl: meta.imageUrl || null,
        domain: new URL(url).hostname.replace(/^www\./, ""),
        bucketId: null,
      })
      .returning();

    return res.status(201).json({ success: true, link: newLink });
  } catch (error) {
    console.error("Failed to save link:", error);
    return res.status(500).json({ error: "Failed to save link" });
  }
}
