import { secretMatches } from "@/lib/auth";
import { shortcutSave } from "@/lib/items";

export const maxDuration = 30;

// iPhone Shortcut (SPEC §6.2): header x-api-key = SHORTCUT_API_KEY; body { url } may be any shared text containing a
// link. Replies with the line the Shortcut shows as a notification.
export async function POST(req: Request) {
  if (!secretMatches(req.headers.get("x-api-key"), process.env.SHORTCUT_API_KEY)) {
    return Response.json({ error: "Invalid API key", message: "Invalid API key" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => null);
  const input = typeof body === "string" ? body : typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url : "";
  const { status, message, number } = await shortcutSave(input);
  return Response.json(status === 400 ? { error: message, message } : { message, number }, { status });
}
