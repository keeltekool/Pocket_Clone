"use client";
import { useRef, useState, type MouseEvent } from "react";
import { timeAgo } from "@/lib/format";
import { Login } from "./Login";
import { cardLabel, type Card } from "./types";
import { HeartButton, IconFolder } from "./ui";

type Item = Card & { pageText: string | null };

// Reader (SPEC §4.6), a Read surface in the app's own world: the saved text set in Fraunces at a reading measure on the
// cream page. Phone: one column, details under the title. From md the details move into a sticky left rail (the /setup
// composition) by grid placement, so every control exists once.
export function ReaderClient({ item, truncated }: { item: Item | null; truncated: boolean }) {
  const [authed, setAuthed] = useState(item !== null);
  if (!item || !authed) return <Login onAuthed={() => location.reload()} />;
  return <Reader item={item} truncated={truncated} onExpired={() => setAuthed(false)} />;
}

const linkClass = "text-small font-medium text-terracotta underline-offset-4 transition-colors hover:text-terracotta-soft hover:underline";

function Reader({ item, truncated, onExpired }: { item: Item; truncated: boolean; onExpired: () => void }) {
  const [favourite, setFavourite] = useState(item.favourite);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Saves go out one after another (click order); only the newest click may revert on failure (as on the card).
  const queue = useRef(Promise.resolve());
  const clicks = useRef(0);
  const saved = useRef(item.favourite); // the server's value: what a failed save reverts to
  const paragraphs = item.pageText?.split(/\n{2,}/).filter((p) => p.trim()) ?? [];

  const show = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2_500);
  };

  function heart() {
    const on = !favourite;
    const click = ++clicks.current;
    setFavourite(on);
    queue.current = queue.current.then(async () => {
      try {
        // keepalive: the save still lands when the owner leaves right after the click.
        const r = await fetch(`/api/items/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ favourite: on }), keepalive: true });
        if (r.status === 401) return onExpired(); // session ended: the login form, which reloads into this page
        if (!r.ok) throw new Error();
        saved.current = on;
      } catch {
        if (click !== clicks.current) return;
        setFavourite(saved.current);
        show("Couldn't update. Try again.");
      }
    });
  }

  function copyNumber() {
    navigator.clipboard?.writeText(`pocket #${item.number}`).catch(() => {});
    show(`Copied pocket #${item.number}`);
  }

  // Back to the list as it was (filter in the URL, scroll restored by the browser) when the Reader was opened from the
  // app; a shared or typed /read link has no app page behind it, so it goes to the main list. A heart save still in
  // flight lands first, so the list shows it.
  function back(e: MouseEvent) {
    e.preventDefault();
    let fromApp = false;
    try {
      fromApp = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1;
    } catch {}
    queue.current.then(() => (fromApp ? history.back() : location.assign("/")));
  }

  const sorting = item.status === "sorting";
  const ago = timeAgo(item.createdAt);
  return (
    <div className="mx-auto max-w-page animate-main-in px-4 pt-2 pb-16 md:px-6 md:pt-6 md:pb-24">
      {/* Phone bar; from md these two live in the rail. */}
      <nav aria-label="Reader" className="mb-6 flex items-center justify-between border-b border-cream-dark pt-2 pb-4 md:hidden">
        <a href="/" onClick={back} className={`reader-back ${linkClass}`}>
          ← Back
        </a>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={`reader-original ${linkClass}`}>
          Original ↗
        </a>
      </nav>

      {/* Rail + text as one centred group: the text keeps its reading measure and the page stays balanced at 1440/1920. */}
      <article className="grid grid-cols-1 md:mx-auto md:max-w-[58.5rem] md:grid-cols-[220px_minmax(0,1fr)] md:gap-x-10 xl:max-w-[61rem] xl:grid-cols-[260px_minmax(0,1fr)]">
        <h1 className="reader-title max-w-[42rem] font-display wrap-anywhere text-title-sm text-balance text-ink md:col-start-2 md:row-start-1 md:pt-4 md:text-[2rem] md:leading-[1.2] xl:text-[2.25rem]">
          {item.title}
        </h1>

        <aside
          aria-label="About this link"
          className="mt-3 flex flex-col gap-3 md:sticky md:top-6 md:col-start-1 md:row-span-3 md:row-start-1 md:mt-0 md:gap-4 md:self-start md:border-r md:border-cream-dark md:py-4 md:pr-6"
        >
          <a href="/" onClick={back} className={`reader-back hidden md:inline ${linkClass}`}>
            ← Back
          </a>
          <p className="text-meta font-medium text-ink-muted md:flex md:flex-col md:gap-1">
            <span className="lowercase">{item.domain}</span>
            <span className="text-ink-faint md:hidden"> · </span>
            <span suppressHydrationWarning className="text-ink-faint">
              <span className="md:hidden">{ago}</span>
              <span className="hidden md:inline">Saved {ago === "Just now" ? "just now" : ago}</span>
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              title={`Copy pocket #${item.number}`}
              onClick={copyNumber}
              className="reader-number cursor-pointer whitespace-nowrap rounded-sm border border-cream-dark bg-cream px-2 py-1 text-micro font-semibold text-ink-muted tabular-nums transition-all duration-150 hover:border-ink-faint hover:bg-cream-dark hover:text-terracotta"
            >
              #{item.number}
            </button>
            <HeartButton on={favourite} number={item.number} onClick={heart} />
            <span
              className={`reader-bucket inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-sm px-2 py-1 text-micro ${
                sorting ? "text-ink-faint" : "border border-cream-dark bg-cream text-ink-muted"
              }`}
            >
              {!sorting && <IconFolder className="shrink-0" />}
              <span className="truncate">{cardLabel(item)}</span>
            </span>
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className={`reader-original hidden md:inline ${linkClass}`}>
            Open original ↗
          </a>
        </aside>

        <div className="my-6 h-px max-w-[42rem] bg-cream-dark md:col-start-2 md:row-start-2 md:my-8" />

        <div className="reader-body max-w-[42rem] md:col-start-2 md:row-start-3">
          {paragraphs.length === 0 ? (
            <div className="reader-empty rounded-md border border-cream-dark bg-warm-white px-5 py-6">
              <p className="text-body text-ink-soft">No text was saved for this link.</p>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block ${linkClass}`}>
                Open the original ↗
              </a>
            </div>
          ) : (
            <>
              {/* wrap-anywhere: page text carries long URLs and tokens that would widen the phone column. */}
              <div className="font-display text-[1.125rem] leading-[1.65] text-pretty wrap-anywhere text-ink md:text-[1.25rem] md:leading-[1.7] [&>p+p]:mt-[1.1em]">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {truncated && (
                <div className="reader-cut mt-10 border-t border-cream-dark pt-5">
                  <p className="text-body text-ink-soft">The saved text ends here.</p>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-block ${linkClass}`}>
                    Read the rest on the original ↗
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </article>

      {toast && (
        <div id="toast" role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-card-in rounded-md bg-ink px-4 py-2 text-small text-warm-white">
          {toast}
        </div>
      )}
    </div>
  );
}
