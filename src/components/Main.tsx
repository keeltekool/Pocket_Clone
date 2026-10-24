"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ItemCard } from "./ItemCard";
import { MobileSheet } from "./MobileSheet";
import { Sidebar, viewName } from "./Sidebar";
import { SuggestionStrip } from "./SuggestionStrip";
import { cardLabel, type BucketRow, type Card, type Prefill, type Suggestion, type View } from "./types";
import { Button, EmptyState, GhostButton, IconChevron, IconClose, IconSearch, TextField } from "./ui";

export type InitialData = { items: Card[]; buckets: BucketRow[]; suggestions: Suggestion[]; now: string };
const POLL_MS = 4_000;
const RESORT_POLL_MS = 5 * 60_000; // after a bucket is created the agent moves links for a while
const SETTLE_POLL_MS = 60_000; // after the last card is filed the agent may still add a suggestion

// Thrown by `api` on a 401: the session ended and the login form is already showing.
class Expired extends Error {}
const expired = (e: unknown) => e instanceof Expired;

export function Main({ initial, initialView, onExpired }: { initial: InitialData; initialView: View; onExpired: () => void }) {
  const [items, setItems] = useState<Card[]>(initial.items);
  const [buckets, setBuckets] = useState<BucketRow[]>(initial.buckets);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initial.suggestions);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
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
  // Live-update poll (SPEC §4.2): runs while a card is Sorting… and until `pollUntil`; `since` is the server clock.
  const pollUntil = useRef(0);
  // Hearts the owner set whose save has not been seen by a later poll yet: id → wanted value, and when its PATCH settled.
  // A poll that read the database before the PATCH landed would otherwise flip the heart back (plan Review focus 1).
  const hearts = useRef(new Map<string, { on: boolean; settledAt: number | null }>());
  const heartQueue = useRef(new Map<string, Promise<void>>());
  // Every card that arrives from the server (poll, search, move) passes through this, so a pending heart wins.
  const withHeart = (c: Card) => (hearts.current.has(c.id) ? { ...c, favourite: hearts.current.get(c.id)!.on } : c);
  const since = useRef(initial.now);
  const [pollKey, setPollKey] = useState(0);

  // Same-origin fetch; a 401 means the session ended → back to the login screen.
  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const r = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
      if (r.status === 401) {
        onExpired();
        throw new Expired();
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

  // Back from the Reader may show this page from the back/forward cache (iOS Safari) with hearts and buckets as they
  // were; a cached page reloads so the list is the server's current one.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => e.persisted && location.reload();
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  // The view lives in the URL too (SPEC §4.2 routes), without a navigation.
  useEffect(() => {
    const href = view.kind === "all" ? "/" : view.kind === "bucket" ? `/?bucket=${view.id}` : `/?view=${view.kind}`;
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
        .then((d) => !stale && setResults((d.items as Card[]).map(withHeart)))
        .catch(() => {});
    }, 300);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q, api]);

  // Keep polling for `ms` more; the tick stops itself once nothing is sorting and the deadline has passed.
  const pollFor = (ms: number) => {
    pollUntil.current = Math.max(pollUntil.current, Date.now() + ms);
    setPollKey((k) => k + 1);
  };
  const sorting = items.some((i) => i.status === "sorting");
  useEffect(() => {
    if (!sorting && Date.now() >= pollUntil.current) return;
    const t = setInterval(async () => {
      try {
        const started = Date.now();
        const [r, s] = await Promise.all([api(`/api/items?changedSince=${encodeURIComponent(since.current)}`), api("/api/suggestions")]);
        const { items: fetched, now } = (await r.json()) as { items: Card[]; now: string };
        since.current = now;
        const changed = fetched.map(withHeart);
        // A poll that started after a heart's PATCH settled read the saved value: the override is no longer needed.
        for (const [id, h] of hearts.current) if (h.settledAt !== null && h.settledAt < started) hearts.current.delete(id);
        if (changed.length) {
          setItems((prev) => merge(prev, changed));
          setResults((prev) => (prev ? merge(prev, changed.filter((c) => prev.some((p) => p.id === c.id))) : prev));
          if (changed.some((c) => c.status !== "sorting")) pollUntil.current = Math.max(pollUntil.current, Date.now() + SETTLE_POLL_MS);
        }
        const next = (await s.json()).suggestions as Suggestion[];
        setSuggestions((prev) => (prev.map((x) => x.id).join() === next.map((x) => x.id).join() ? prev : next));
        if (!changed.some((c) => c.status === "sorting") && Date.now() >= pollUntil.current) setPollKey((k) => k + 1); // re-evaluate
      } catch {}
    }, POLL_MS);
    return () => clearInterval(t);
  }, [sorting, pollKey, api]);

  const inView = (c: Card) =>
    view.kind === "all" ||
    (view.kind === "unsorted" ? c.status === "unsorted" : view.kind === "favourites" ? c.favourite : c.bucket?.id === view.id);
  const visible = (results ?? items).filter(inView);
  const counts = useMemo(() => {
    const perBucket = new Map<string, number>();
    let unsorted = 0;
    let favourites = 0;
    for (const i of items) {
      if (i.status === "unsorted") unsorted++;
      if (i.favourite) favourites++;
      if (i.bucket) perBucket.set(i.bucket.id, (perBucket.get(i.bucket.id) ?? 0) + 1);
    }
    return { all: items.length, unsorted, favourites, bucket: (id: string) => perBucket.get(id) ?? 0 };
  }, [items]);

  function focusCard(id: string) {
    setHighlight(id);
    setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => setHighlight(null), 2_000);
  }

  // Every card edit applies to the full list and to the current search results alike.
  const patchCards = (fn: (c: Card) => Card | null) => {
    const apply = (list: Card[]) => list.flatMap((c) => { const n = fn(c); return n ? [n] : []; });
    setItems(apply);
    setResults((prev) => (prev ? apply(prev) : prev));
  };
  // Runs an action; a lost session is handled by `api` (login screen), anything else becomes a toast.
  const attempt = (fn: () => Promise<void>, failure: string) => fn().catch((err) => { if (!expired(err)) show(failure); });

  async function save(e: FormEvent) {
    e.preventDefault();
    const input = url.trim();
    if (!input || saving) return;
    setSaving(true);
    setAddError(null);
    await attempt(async () => {
      const r = await api("/api/items", { method: "POST", body: JSON.stringify({ url: input }) });
      const body = await r.json().catch(() => ({}));
      if (r.status === 400) return setAddError(body.error || "That doesn't look like a link.");
      if (!r.ok) throw new Error(body.error);
      const item: Card = body.item;
      setUrl("");
      if (body.duplicate) {
        show(`Already saved as #${item.number} · ${cardLabel(item)}`);
        setItems((prev) => merge(prev, [item]));
        if (!inView(item)) setView({ kind: "all" });
        if (results && !results.some((c) => c.id === item.id)) setQ(""); // the card must be on screen to scroll to
        focusCard(item.id);
      } else {
        setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
      }
    }, "Couldn't save. Try again.");
    setSaving(false);
  }

  const move = (item: Card, bucketId: string | null) =>
    attempt(async () => {
      const r = await api(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ bucketId }) });
      if (!r.ok) throw new Error();
      const { item: updated } = (await r.json()) as { item: Card };
      patchCards((c) => (c.id === updated.id ? withHeart(updated) : c));
    }, "Couldn't move. Try again.");

  // Heart (SPEC §6.6a): flips at once and sends the new value. Saves for one card go out one after another, so two quick
  // clicks reach the server in click order; a failed save flips the card back unless a newer click has replaced it.
  function favourite(item: Card) {
    const on = !item.favourite;
    const flip = (v: boolean) => patchCards((c) => (c.id === item.id ? { ...c, favourite: v } : c));
    const mine = { on, settledAt: null as number | null };
    hearts.current.set(item.id, mine);
    flip(on);
    const save = () =>
      attempt(async () => {
        try {
          const r = await api(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ favourite: on }) });
          if (!r.ok) throw new Error();
        } catch (err) {
          if (hearts.current.get(item.id) === mine) {
            hearts.current.delete(item.id);
            flip(!on);
          }
          throw err;
        }
      }, "Couldn't update. Try again.").then(() => {
        mine.settledAt = Date.now();
      });
    heartQueue.current.set(item.id, (heartQueue.current.get(item.id) ?? Promise.resolve()).then(save));
  }

  const remove = (item: Card) =>
    attempt(async () => {
      const r = await api(`/api/items/${item.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 404) throw new Error();
      patchCards((c) => (c.id === item.id ? null : c));
      show(`Deleted #${item.number}`);
    }, "Couldn't delete. Try again.");

  // + New bucket, or a suggestion's Create bucket (then the suggestion is marked created). The agent moves matching
  // Unsorted links afterwards, so the page keeps polling for a while.
  async function createBucket(name: string, suggestionId: string | null): Promise<string | null> {
    try {
      const r = await api("/api/buckets", { method: "POST", body: JSON.stringify({ name, suggestionId }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) return body.error || "Couldn't create the bucket.";
      setBuckets((prev) => [...prev, { id: body.bucket.id, name: body.bucket.name }]);
      if (suggestionId) setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      pollFor(RESORT_POLL_MS);
      return null;
    } catch (err) {
      return expired(err) ? null : "Couldn't create the bucket.";
    }
  }

  const dismissSuggestion = (s: Suggestion) =>
    attempt(async () => {
      const r = await api(`/api/suggestions/${s.id}/dismiss`, { method: "POST" });
      if (!r.ok && r.status !== 404) throw new Error();
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    }, "Couldn't dismiss. Try again.");

  // Create bucket from the strip: the new-bucket field opens pre-filled (sidebar, or the sheet on phones).
  function startFromSuggestion(s: Suggestion) {
    const phone = window.matchMedia("(max-width: 767px)").matches;
    setPrefill({ name: s.name, suggestionId: s.id, target: phone ? "sheet" : "sidebar", nonce: Date.now() });
    if (phone) setSheetOpen(true);
  }
  // Links of a suggestion that are still Unsorted (the stored list is a snapshot).
  const unsortedOf = (s: Suggestion) => s.itemNumbers.filter((n) => items.some((i) => i.number === n && i.status === "unsorted")).length;

  const renameBucket = (b: BucketRow) =>
    attempt(async () => {
      const name = prompt("Rename bucket:", b.name)?.trim();
      if (!name || name === b.name) return;
      const r = await api(`/api/buckets/${b.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) return show(body.error || "Couldn't rename the bucket.");
      setBuckets((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: body.bucket.name } : x)));
      patchCards((c) => (c.bucket?.id === b.id ? { ...c, bucket: { id: b.id, name: body.bucket.name } } : c));
    }, "Couldn't rename the bucket.");

  const deleteBucket = (b: BucketRow) =>
    attempt(async () => {
      const n = counts.bucket(b.id);
      if (!confirm(`Delete "${b.name}"? Its ${n} ${n === 1 ? "link moves" : "links move"} to Unsorted.`)) return;
      const r = await api(`/api/buckets/${b.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setBuckets((prev) => prev.filter((x) => x.id !== b.id));
      patchCards((c) => (c.bucket?.id === b.id ? { ...c, bucket: null, status: "unsorted" } : c));
      if (view.kind === "bucket" && view.id === b.id) setView({ kind: "all" });
    }, "Couldn't delete the bucket.");

  const logout = () => fetch("/api/auth", { method: "DELETE" }).catch(() => {}).then(onExpired);

  function copyNumber(item: Card) {
    navigator.clipboard?.writeText(`pocket #${item.number}`).catch(() => {});
    show(`Copied pocket #${item.number}`);
  }

  const nav = {
    buckets, counts, view, onView: setView, onCreate: createBucket, onRename: renameBucket, onDelete: deleteBucket,
    prefill, onPrefillDone: () => setPrefill(null),
  };
  const suggestion = suggestions[0] ?? null;

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

          {suggestion && !q.trim() && (
            <SuggestionStrip suggestion={suggestion} count={unsortedOf(suggestion)} onCreate={() => startFromSuggestion(suggestion)} onDismiss={() => dismissSuggestion(suggestion)} />
          )}

          {visible.length === 0 ? (
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
                  onFavourite={() => favourite(c)}
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
  if (view.kind === "favourites") return <EmptyState title="No favourites yet." hint="Tap the heart on a link to keep it here." />;
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
