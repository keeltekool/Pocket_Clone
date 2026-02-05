import { db } from "../../lib/db";
import { buckets, links } from "../../lib/schema";
import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { eq, and } from "drizzle-orm";


export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") return methodNotAllowed(res);

  const userId = await getUserId(req);
  if (!userId) return unauthorized(res);

  try {
    const { linkId, title, domain, url } = req.body;
    if (!linkId) return badRequest(res, "linkId is required");

    // Get user's existing buckets
    const userBuckets = await db
      .select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(eq(buckets.userId, userId));

    const bucketNames = userBuckets.map((b) => b.name);

    // Build prompt for Claude
    const prompt = `You are a link categorization assistant. Given a saved link, suggest the best bucket/category for it.

Link details:
- Title: ${title || "Unknown"}
- Domain: ${domain || "Unknown"}
- URL: ${url}

User's existing buckets: ${bucketNames.length > 0 ? bucketNames.join(", ") : "None yet"}

Instructions:
1. If an existing bucket fits well, return its exact name
2. If no bucket fits, suggest a new short category name (1-2 words, like "Tech", "News", "Shopping", "Work", "Learning")
3. Return ONLY a JSON object, nothing else

Response format:
{"bucket": "bucket name here", "isNew": true/false}

Examples:
- Tech article on existing "Tech" bucket: {"bucket": "Tech", "isNew": false}
- Recipe site with no food bucket: {"bucket": "Recipes", "isNew": true}`;

    // Call Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY not configured" });
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content[0]?.text || "";

    // Parse Claude's response
    let suggestion: { bucket: string; isNew: boolean };
    try {
      suggestion = JSON.parse(responseText.trim());
    } catch {
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse Claude response");
      }
    }

    let bucketId: string | null = null;
    let bucketName: string = suggestion.bucket;

    if (suggestion.isNew) {
      // Create new bucket
      try {
        const [newBucket] = await db
          .insert(buckets)
          .values({ userId, name: suggestion.bucket })
          .returning();

        bucketId = newBucket.id;
        bucketName = newBucket.name;
      } catch {
        // Race condition: bucket might already exist, try to find it
        const existing = await db
          .select({ id: buckets.id, name: buckets.name })
          .from(buckets)
          .where(and(eq(buckets.userId, userId), eq(buckets.name, suggestion.bucket)));

        if (existing.length > 0) {
          bucketId = existing[0].id;
          bucketName = existing[0].name;
        }
      }
    } else {
      // Find existing bucket (case-insensitive)
      const existingBucket = userBuckets.find(
        (b) => b.name.toLowerCase() === suggestion.bucket.toLowerCase()
      );
      if (existingBucket) {
        bucketId = existingBucket.id;
        bucketName = existingBucket.name;
      }
    }

    // Update the link with the bucket
    if (bucketId) {
      await db
        .update(links)
        .set({ bucketId })
        .where(and(eq(links.id, linkId), eq(links.userId, userId)));
    }

    return res.status(200).json({
      success: true,
      bucketId,
      bucketName,
      isNew: suggestion.isNew,
    });
  } catch (error: any) {
    console.error("Categorization error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
