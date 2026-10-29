import { secretMatches } from "@/lib/auth";
import { shortcutSave } from "@/lib/items";

export const maxDuration = 30;

// The short iPhone Shortcut: one Get Contents of URL on /api/save/<SHORTCUT_API_KEY>?url=<Shortcut Input>, its plain-text
// reply shown as the notification. Everything after "?url=" is the shared text, taken raw: a shared link keeps its own
// ?query&params unencoded, so URLSearchParams would cut it at the first "&". Text that doesn't start with a link
// (e.g. "Look at this https://…") arrives percent-encoded and is decoded; its spaces reach req.url as "+".
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!secretMatches((await params).key, process.env.SHORTCUT_API_KEY)) return text("Invalid key", 401);
  const at = req.url.indexOf("?url=");
  const raw = at < 0 ? "" : req.url.slice(at + 5);
  let input = raw;
  if (!/^https?:\/\//i.test(raw)) {
    try {
      input = decodeURIComponent(raw.replace(/\+/g, " "));
    } catch {}
  }
  const { status, message } = await shortcutSave(input);
  return text(message, status);
}
