import { db } from "../../lib/db";
import { links } from "../../lib/schema";
import { methodNotAllowed, badRequest } from "../../lib/auth";


export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") return methodNotAllowed();

  // Authenticate via API key (for iOS shortcut)
  const apiKey = req.headers.get("X-API-Key");
  const userId = req.headers.get("X-User-Id");

  if (!apiKey || apiKey !== process.env.SHORTCUT_API_KEY) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!userId) return badRequest("X-User-Id header is required");

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

    return Response.json({ success: true, link: newLink }, { status: 201 });
  } catch (error) {
    console.error("Failed to save link:", error);
    return Response.json({ error: "Failed to save link" }, { status: 500 });
  }
}
