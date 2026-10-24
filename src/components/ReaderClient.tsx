"use client";
import { useState, type MouseEvent, type ReactNode } from "react";
import { timeAgo } from "@/lib/format";
import { heartSaver } from "./heart";
import { Login } from "./Login";
import { chipClass, linkClass } from "./styles";
import { cardLabel, type Card } from "./types";
import { copyPocketNumber, HeartButton, IconFolder, useToast } from "./ui";

// Reader (SPEC §4.6), a Read surface in the app's own world: the saved text set in Fraunces at a reading measure on the
// cream page. Phone: one column, details under the title, Back and Original in a top bar. From md the details, Back and
// Original sit in a sticky left rail (the /setup composition) by grid placement. The text itself (`children`) is
// ReaderBody, rendered on the server.
export function ReaderClient({ item, children }: { item: Card | null; children?: ReactNode }) {
  const [authed, setAuthed] = useState(item !== null);
  if (!item || !authed) return <Login onAuthed={() => location.reload()} />;
  return (
    <Reader item={item} onExpired={() => setAuthed(false)}>
      {children}
    </Reader>
  );
}

function Reader({ item, onExpired, children }: { item: Card; onExpired: () => void; children: ReactNode }) {
  const [favourite, setFavourite] = useState(item.favourite);
  const [toast, show] = useToast();
  const [saver] = useState(() =>
    heartSaver(item.id, item.favourite, setFavourite, (sessionEnded) => (sessionEnded ? onExpired() : show("Couldn't update. Try again."))),
  );

  // Back to the list as it was (filter in the URL, scroll restored by the browser) when the Reader was opened from the
  // app; a shared or typed /read link has no app page behind it, so it goes to the main list. A heart save still in
  // flight lands first, so the list shows it.
  function back(e: MouseEvent) {
    e.preventDefault();
    let fromApp = false;
    try {
      fromApp = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1;
    } catch {}
    saver.settled().then(() => (fromApp ? history.back() : location.assign("/")));
  }

  const sorting = item.status === "sorting";
  const ago = timeAgo(item.createdAt);
  return (
    <div className="mx-auto max-w-page animate-main-in px-4 pt-2 pb-16 md:px-6 md:pt-6 md:pb-24">
      {/* Phone bar; from md these two live in the rail (display:none hides the other copy from screen readers too). */}
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
              onClick={() => copyPocketNumber(item.number, show)}
              className={`reader-number cursor-pointer tabular-nums ${chipClass}`}
            >
              #{item.number}
            </button>
            <HeartButton on={favourite} number={item.number} onClick={() => saver.save(!favourite)} />
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

        <div className="reader-body max-w-[42rem] md:col-start-2 md:row-start-3">{children}</div>
      </article>

      {toast}
    </div>
  );
}
