import { badRequest } from "@/lib/auth";
import { listItems, NotALink, saveLink } from "@/lib/items";
import { retryStuck } from "@/lib/sorter";

// The save path fetches the page (8 s cap) before answering; the agent session starts after the response.
export const maxDuration = 30;

// Session is checked by src/proxy.ts for every /api route except the open ones. `now` is the server clock taken before
// the query: the poll passes it back as the next changedSince, so device clocks and slow requests lose nothing.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (!p.has("changedSince") && !p.has("q")) await retryStuck(); // a full list load is the stuck-item check (SPEC §6.4)
  const now = new Date().toISOString();
  const list = await listItems({ bucket: p.get("bucket"), q: p.get("q"), changedSince: p.get("changedSince") });
  return Response.json({ items: list, now });
}

export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({}));
  if (typeof url !== "string") return badRequest("That doesn't look like a link.");
  try {
    const { item, duplicate } = await saveLink(url);
    return Response.json(duplicate ? { duplicate: true, item } : { item }, { status: duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof NotALink) return badRequest(e.message);
    throw e;
  }
}
