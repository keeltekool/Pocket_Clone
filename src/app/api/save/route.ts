import { createHash, timingSafeEqual } from "node:crypto";
import { NotALink, saveLink } from "@/lib/items";
import { cardLabel } from "@/components/types";

export const maxDuration = 30;

// iPhone Shortcut (SPEC §6.2): header x-api-key = SHORTCUT_API_KEY; body { url } may be any shared text containing a
// link. Replies with the line the Shortcut shows as a notification.
const sha = (s: string) => createHash("sha256").update(s).digest();
export async function POST(req: Request) {
  const key = req.headers.get("x-api-key") ?? "";
  const expected = process.env.SHORTCUT_API_KEY;
  if (!expected || !key || !timingSafeEqual(sha(key), sha(expected))) {
    return Response.json({ error: "Invalid API key", message: "Invalid API key" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => null);
  const input = typeof body === "string" ? body : typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url : "";
  try {
    const { item, duplicate } = await saveLink(input);
    const message = duplicate ? `Already saved #${item.number} · ${cardLabel({ ...item, createdAt: String(item.createdAt) })}` : `Saved #${item.number}`;
    return Response.json({ message, number: item.number }, { status: duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof NotALink) return Response.json({ error: "No link found", message: "No link found" }, { status: 400 });
    throw e;
  }
}
