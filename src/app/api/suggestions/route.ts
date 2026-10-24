import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bucketSuggestions } from "@/db/schema";

// Open bucket suggestions, newest first (SPEC §8). The UI shows the newest one.
export async function listOpenSuggestions() {
  return db
    .select({ id: bucketSuggestions.id, name: bucketSuggestions.name, reason: bucketSuggestions.reason, itemNumbers: bucketSuggestions.itemNumbers, createdAt: bucketSuggestions.createdAt })
    .from(bucketSuggestions)
    .where(eq(bucketSuggestions.status, "open"))
    .orderBy(desc(bucketSuggestions.createdAt));
}

export async function GET() {
  return Response.json({ suggestions: await listOpenSuggestions() });
}
