import { listOpenSuggestions } from "@/lib/suggestions";

export async function GET() {
  return Response.json({ suggestions: await listOpenSuggestions() });
}
