import { secretMatches } from "@/lib/auth";
import { bucketLabel } from "@/lib/format";
import { NotALink, saveLink } from "@/lib/items";

export const maxDuration = 30;

// iPhone Shortcut (SPEC §6.2): header x-api-key = SHORTCUT_API_KEY; body { url } may be any shared text containing a
// link. Replies with the line the Shortcut shows as a notification.
export async function POST(req: Request) {
  if (!secretMatches(req.headers.get("x-api-key"), process.env.SHORTCUT_API_KEY)) {
    return Response.json({ error: "Invalid API key", message: "Invalid API key" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => null);
  const input = typeof body === "string" ? body : typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url : "";
  try {
    const { item, duplicate } = await saveLink(input);
    const message = duplicate ? `Already saved #${item.number} · ${bucketLabel(item.status, item.bucket?.name)}` : `Saved #${item.number}`;
    return Response.json({ message, number: item.number }, { status: duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof NotALink) return Response.json({ error: "No link found", message: "No link found" }, { status: 400 });
    throw e;
  }
}
