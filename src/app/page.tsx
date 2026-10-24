import { cookies } from "next/headers";
import { Shell } from "@/components/Shell";
import type { View } from "@/components/types";
import { hasSession } from "@/lib/auth";
import { bucketCounts, listItems } from "@/lib/items";
import { listOpenSuggestions } from "./api/suggestions/route";

export const dynamic = "force-dynamic";

// Main view (SPEC §4.2). The session is checked here, server-side: logged out renders the login form, logged in renders
// the list with its data already in the HTML (no loading flash).
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jar = await cookies();
  const session = jar.get("pc_session")?.value;
  const authed = hasSession(session ? `pc_session=${session}` : null);
  const sp = await searchParams;
  let view: View = sp.view === "unsorted" ? { kind: "unsorted" } : sp.bucket ? { kind: "bucket", id: sp.bucket } : { kind: "all" };

  if (!authed) return <Shell authed={false} initial={null} view={view} />;
  const [items, counts, suggestions] = await Promise.all([listItems(), bucketCounts(), listOpenSuggestions()]);
  const wanted = view.kind === "bucket" ? view.id : null;
  if (wanted && !counts.buckets.some((b) => b.id === wanted)) view = { kind: "all" }; // stale ?bucket= link
  return (
    <Shell
      authed
      view={view}
      initial={{
        items: items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
        buckets: counts.buckets.map(({ id, name }) => ({ id, name })),
        suggestions: suggestions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      }}
    />
  );
}
