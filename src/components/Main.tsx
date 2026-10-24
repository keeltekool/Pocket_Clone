"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ItemCard } from "./ItemCard";
import { MobileSheet } from "./MobileSheet";
import { Sidebar, viewName } from "./Sidebar";
import { cardLabel, sameView, type BucketRow, type Card, type View } from "./types";
import { Button, EmptyState, GhostButton, IconChevron, IconClose, IconSearch, Spinner, TextField } from "./ui";

export type InitialData = { items: Card[]; buckets: BucketRow[] };
const POLL_MS = 4_000;

export function Main({ initial, initialView, onExpired }: { initial: InitialData | null; initialView: View; onExpired: () => void }) {
  const [items, setItems] = useState<Card[] | null>(initial?.items ?? null);
  const [buckets, setBuckets] = useState<BucketRow[]>(initial?.buckets ?? []);
  const [view, setView] = useState<View>(initialView);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Card[] | null>(null);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Same-origin fetch; a 401 means the session ended → back to the login screen.
  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const r = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
      if (r.status === 401) {
        onExpired();
        throw new Error("Session expired");
      }
      return r;
    },
    [onExpired],
  );

  const show = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2_500);
  }, []);

  // After a fresh login there is no server-rendered data yet.
  useEffect(() => {
    if (items) return;
    Promise.all([api("/api/items").then((r) => r.json()), api("/api/buckets").then((r) => r.json())])
      .then(([i, b]) => {
        setItems(i.items);
        setBuckets(b.buckets);
      })
      .catch(() => {});
  }, [items, api]);

  // The view lives in the URL too (SPEC §4.2 routes), without a navigation.
  useEffect(() => {
    const href = view.kind === "all" ? "/" : view.kind === "unsorted" ? "/?view=unsorted" : `/?bucket=${view.id}`;
    if (location.pathname + location.search !== href) history.replaceState(null, "", href);
  }, [view]);

  // Search: 300 ms debounce, server-side (page text lives there), restricted to the current view below.
  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults(null);
      return;
    }
    let stale = false;
    const t = setTimeout(() => {
      api(`/api/items?q=${encodeURIComponent(needle)}`)
        .then((r) => r.json())
        .then((d) => !stale && setResults(d.items))
        .catch(() => {});
    }, 300);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q, api]);

  // While any card is Sorting…, pull changed items every 4 s (SPEC §4.2 live updates).
  const sorting = !!items?.some((i) => i.status === "sorting");
  useEffect(() => {
    if (!sorting) return;
    let since = new Date(Date.now() - 10_000).toISOString();
    const t = setInterval(async () => {
      try {
        const r = await api(`/api/items?changedSince=${encodeURIComponent(since)}`);
        const { items: changed } = (await r.json()) as { items: Card[] };
        since = new Date(Date.now() - 1_000).toISOString();
        if (changed.length) setItems((prev) => merge(prev ?? [], changed));
      } catch {}
    }, POLL_MS);
    return () => clearInterval(t);
  }, [sorting, api]);

  const inView = (c: Card) =>
    view.kind === "all" ? true : view.kind === "unsorted" ? c.status === "unsorted" : c.bucket?.id === view.id;
  const visible = (results ?? items ?? []).filter(inView);
  const counts = {
    all: items?.length ?? 0,
    unsorted: items?.filter((i) => i.status === "unsorted").length ?? 0,
    bucket: (id: string) => items?.filter((i) => i.bucket?.id === id).length ?? 0,
  };

  function focusCard(id: string) {
    setHighlight(id);
    setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => setHighlight(null), 2_000);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const input = url.trim();
    if (!input || saving) return;
    setSaving(true);
    setAddError(null);
    try {
      const r = await api("/api/items", { method: "POST", body: JSON.stringify({ url: input }) });
      const body = await r.json().catch(() => ({}));
      if (r.status === 400) {
        setAddError(body.error || "That doesn't look like a link.");
        return;
      }
      if (!r.ok) throw new Error(body.error);
      const item: Card = body.item;
      setUrl("");
      if (body.duplicate) {
        show(`Already saved as #${item.number} · ${cardLabel(item)}`);
        setItems((prev) => merge(prev ?? [], [item]));
        if (!inView(item)) setView({ kind: "all" });
        focusCard(item.id);
      } else {
        setItems((prev) => [item, ...(prev ?? []).filter((i) => i.id !== item.id)]);
      }
    } catch (err) {
      if ((err as Error).message !== "Session expired") show("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function move(item: Card, bucketId: string | null) {
    const r = await api(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ bucketId }) });
    if (!r.ok) return show("Couldn't move. Try again.");
    const { item: updated } = await r.json();
    setItems((prev) => merge(prev ?? [], [updated]));
  }

  async function remove(item: Card) {
    const r = await api(`/api/items/${item.id}`, { method: "DELETE" });
    if (!r.ok && r.status !== 404) return show("Couldn't delete. Try again.");
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
    setResults((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    show(`Deleted #${item.number}`);
  }

  async function createBucket(name: string): Promise<string | null> {
    const r = await api("/api/buckets", { method: "POST", body: JSON.stringify({ name }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return body.error || "Couldn't create the bucket.";
    setBuckets((prev) => [...prev, { id: body.bucket.id, name: body.bucket.name }]);
    return null;
  }

  async function renameBucket(b: BucketRow) {
    const name = prompt("Rename bucket:", b.name)?.trim();
    if (!name || name === b.name) return;
    const r = await api(`/api/buckets/${b.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return show(body.error || "Couldn't rename the bucket.");
    setBuckets((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: body.bucket.name } : x)));
    setItems((prev) => (prev ?? []).map((i) => (i.bucket?.id === b.id ? { ...i, bucket: { id: b.id, name: body.bucket.name } } : i)));
  }

  async function deleteBucket(b: BucketRow) {
    const n = counts.bucket(b.id);
    if (!confirm(`Delete "${b.name}"? Its ${n} ${n === 1 ? "link moves" : "links move"} to Unsorted.`)) return;
    const r = await api(`/api/buckets/${b.id}`, { method: "DELETE" });
    if (!r.ok) return show("Couldn't delete the bucket.");
    setBuckets((prev) => prev.filter((x) => x.id !== b.id));
    setItems((prev) => (prev ?? []).map((i) => (i.bucket?.id === b.id ? { ...i, bucket: null, status: "unsorted" } : i)));
    if (view.kind === "bucket" && view.id === b.id) setView({ kind: "all" });
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    onExpired();
  }

  function copyNumber(item: Card) {
    navigator.clipboard?.writeText(`pocket #${item.number}`).catch(() => {});
    show(`Copied pocket #${item.number}`);
  }

  const nav = { buckets, counts, view, onView: setView, onCreate: createBucket, onRename: renameBucket, onDelete: deleteBucket };

  return (
    <div className="mx-auto max-w-page animate-main-in p-4 md:px-6 md:pt-6 md:pb-16">
      <header className="mb-4 flex items-center justify-between border-b border-cream-dark pt-2 pb-4 md:mb-6 md:pt-4 md:pb-10">
        <h1 className="font-display text-title-sm text-ink md:text-title">Pocket Clone</h1>
        <div className="flex items-center gap-2">
          <a
            href="/setup"
            className="rounded-sm px-2 py-1.5 text-small font-medium text-ink-muted transition-colors hover:bg-warm-white hover:text-ink md:px-4 md:py-2"
          >
            Set up saving
          </a>
          <GhostButton id="logout-btn" onClick={logout}>
            Logout
          </GhostButton>
        </div>
      </header>

      <div className="flex flex-col md:flex-row md:gap-10">
        <aside className="hidden w-[220px] shrink-0 py-4 md:block xl:w-[260px]">
          <Sidebar {...nav} />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 md:hidden">
            <button
              id="mobile-filter-btn"
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-cream-dark bg-warm-white px-4 py-2 text-label font-medium text-ink-soft transition-all duration-150 hover:border-ink-faint"
            >
              <span id="mobile-filter-name">{viewName(view, buckets)}</span>
              <IconChevron className="text-ink-muted" />
            </button>
          </div>

          <form id="add-link-form" onSubmit={save} className="flex gap-2 md:gap-4">
            <TextField
              id="url-input"
              type="text"
              inputMode="url"
              placeholder="Paste a link…"
              autoComplete="off"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setAddError(null);
              }}
            />
            <Button id="add-btn" type="submit" disabled={saving}>
              Save
            </Button>
          </form>
          {addError && (
            <p id="add-error" className="mt-2 text-small text-danger">
              {addError}
            </p>
          )}

          <div className="relative mt-3 mb-6 md:mb-8">
            <IconSearch className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint" />
            <TextField
              id="search-input"
              type="search"
              placeholder="Search titles and pages…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-11 md:pl-12 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-ink-muted hover:bg-cream hover:text-ink"
              >
                <IconClose size={16} />
              </button>
            )}
          </div>

          {!items ? (
            <div className="flex items-center justify-center gap-2.5 p-6 text-label text-ink-muted">
              <Spinner /> Loading…
            </div>
          ) : visible.length === 0 ? (
            <Empty view={view} buckets={buckets} q={q.trim()} total={items.length} />
          ) : (
            <div id="links-grid" className="flex flex-col gap-2">
              {visible.map((c, i) => (
                <ItemCard
                  key={c.id}
                  item={c}
                  index={i}
                  buckets={buckets}
                  highlight={highlight === c.id}
                  onCopy={() => copyNumber(c)}
                  onMove={(bucketId) => move(c, bucketId)}
                  onDelete={() => remove(c)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <MobileSheet open={sheetOpen} onClose={() => setSheetOpen(false)} {...nav} onView={(v) => { setView(v); setSheetOpen(false); }} />

      {toast && (
        <div id="toast" role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-card-in rounded-md bg-ink px-4 py-2 text-small text-warm-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// Replace changed cards in place; new ones (saved elsewhere, e.g. from the phone) go to the top, newest first.
function merge(prev: Card[], changed: Card[]): Card[] {
  const byId = new Map(changed.map((c) => [c.id, c]));
  const kept = prev.map((c) => byId.get(c.id) ?? c);
  const fresh = changed.filter((c) => !prev.some((p) => p.id === c.id)).sort((a, b) => b.number - a.number);
  return [...fresh, ...kept];
}

function Empty({ view, buckets, q, total }: { view: View; buckets: BucketRow[]; q: string; total: number }) {
  if (q) return <EmptyState title={`No links match "${q}"`} />;
  if (view.kind === "unsorted") return <EmptyState title="Nothing unsorted." hint="Every link found a bucket." />;
  if (view.kind === "bucket") return <EmptyState title={`No links in ${viewName(view, buckets)} yet.`} />;
  if (total === 0)
    return (
      <EmptyState title="Nothing saved yet" hint="Paste a link above, or save from your phone or browser.">
        <a href="/setup" className="mt-4 inline-block text-small font-medium text-terracotta hover:underline">
          Set up saving
        </a>
      </EmptyState>
    );
  return <EmptyState title="Nothing here." />;
}

export { sameView };
