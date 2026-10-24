import { cookies } from "next/headers";
import { Shell } from "@/components/Shell";
import type { View } from "@/components/types";
import { hasSession } from "@/lib/auth";
import { bucketCounts, listItems } from "@/lib/items";
import { retryStuck } from "@/lib/sorter";
import { listOpenSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

// Main view (SPEC §4.2). The session is checked here, server-side: logged out renders the login form, logged in renders
// the list with its data already in the HTML (no loading flash).
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const authed = hasSession((await cookies()).toString());
  const sp = await searchParams;
  let view: View =
    sp.view === "unsorted" || sp.view === "favourites" ? { kind: sp.view } : sp.bucket ? { kind: "bucket", id: sp.bucket } : { kind: "all" };

  if (!authed) return <Shell authed={false} initial={null} view={view} />;
  await retryStuck(); // a main-view load is the stuck-item check (SPEC §6.4)
  const now = new Date().toISOString();
  const [items, counts, suggestions] = await Promise.all([listItems(), bucketCounts(), listOpenSuggestions()]);
  const wanted = view.kind === "bucket" ? view.id : null;
  if (wanted && !counts.buckets.some((b) => b.id === wanted)) view = { kind: "all" }; // stale ?bucket= link
  return (
    <Shell
      authed
      view={view}
      initial={{
        items,
        buckets: counts.buckets.map(({ id, name }) => ({ id, name })),
        suggestions: suggestions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
        now,
      }}
    />
  );
}
