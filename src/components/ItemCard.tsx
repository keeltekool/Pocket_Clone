"use client";
import { useRef, useState } from "react";
import { favicon, timeAgo } from "@/lib/format";
import { cardLabel, type BucketRow, type Card } from "./types";
import { IconChevron, IconFolder, IconTrash, Menu, MenuItem, useDismiss } from "./ui";

type Props = {
  item: Card;
  index: number;
  buckets: BucketRow[];
  highlight: boolean;
  onCopy: () => void;
  onMove: (bucketId: string | null) => void;
  onDelete: () => void;
};

// One saved link (SPEC §4.2): image, title, domain · date, #N (copies `pocket #N`), bucket label menu, delete.
// One actions row, placed by the grid: on phones (SPEC §10) under the meta line, with delete inside the label menu;
// from md up in a third column with the trash icon.
export function ItemCard({ item, index, buckets, highlight, onCopy, onMove, onDelete }: Props) {
  const img = item.imageUrl ?? favicon(item.domain);
  return (
    <article
      id={`item-${item.id}`}
      data-number={item.number}
      style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
      className={`item-card group relative grid animate-card-in grid-cols-[70px_1fr] grid-rows-[auto_auto] items-center gap-x-3 gap-y-1.5 rounded-md border bg-warm-white p-2 transition-all duration-300 ease-out has-[[data-open]]:z-30 md:grid-cols-[80px_1fr_auto] md:grid-rows-1 md:pr-3 md:pl-4 ${
        highlight
          ? "border-terracotta ring-4 ring-terracotta-glow"
          : "border-cream-dark hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-card-hover"
      }`}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="row-span-2 block h-[50px] w-[70px] self-start overflow-hidden rounded-sm bg-cream-dark md:row-span-1 md:h-14 md:w-20 md:self-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-400 ease-out group-hover:scale-105"
          onError={(e) => {
            if (!e.currentTarget.src.includes("favicons")) e.currentTarget.src = favicon(item.domain);
          }}
        />
      </a>

      <div className="min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-title line-clamp-2 font-display text-card text-ink transition-colors duration-200 hover:text-terracotta"
        >
          {item.title}
        </a>
        <div className="card-meta mt-0.5 truncate text-meta font-medium text-ink-muted">
          <span className="lowercase">{item.domain}</span>
          <span className="text-ink-faint"> · </span>
          <span suppressHydrationWarning className="text-ink-faint">{timeAgo(item.createdAt)}</span>
        </div>
      </div>

      <div className="col-start-2 flex items-center gap-2 md:col-start-3 md:row-start-1">
        <button
          type="button"
          title={`Copy pocket #${item.number}`}
          onClick={onCopy}
          className="card-number cursor-pointer whitespace-nowrap rounded-sm border border-cream-dark bg-cream px-2 py-1 text-micro font-semibold text-ink-muted tabular-nums transition-all duration-150 hover:border-ink-faint hover:bg-cream-dark hover:text-terracotta"
        >
          #{item.number}
        </button>
        <BucketLabel item={item} buckets={buckets} onMove={onMove} onDelete={onDelete} />
        <button
          type="button"
          title="Delete"
          aria-label={`Delete #${item.number}`}
          onClick={onDelete}
          className="delete-btn hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-faint opacity-0 transition-all duration-200 ease-out group-hover:opacity-100 hover:scale-110 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 active:scale-95 md:flex"
        >
          <IconTrash />
        </button>
      </div>
    </article>
  );
}

// `Sorting…` is plain text; otherwise a chip that opens the move menu (every bucket + Unsorted; on phones also Delete).
function BucketLabel({ item, buckets, onMove, onDelete }: { item: Card; buckets: BucketRow[]; onMove: (id: string | null) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  if (item.status === "sorting")
    return (
      <span className="card-bucket inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-1 py-1 text-micro text-ink-faint">
        <span className="size-3 animate-spin rounded-full border-[1.5px] border-cream-dark border-t-terracotta" />
        Sorting…
      </span>
    );

  const pick = (id: string | null) => {
    setOpen(false);
    if ((item.bucket?.id ?? null) !== id) onMove(id);
  };
  return (
    <div ref={ref} className="relative min-w-0" data-open={open || undefined}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="card-bucket-btn flex max-w-[160px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm border border-cream-dark bg-cream px-2 py-1 text-micro text-ink-muted transition-all duration-150 ease-out hover:border-ink-faint hover:bg-cream-dark md:max-w-[200px]"
      >
        <IconFolder className="shrink-0" />
        <span className="card-bucket truncate">{cardLabel(item)}</span>
        <IconChevron size={10} className="shrink-0" />
      </button>
      {open && (
        <Menu className="absolute top-[calc(100%+4px)] left-0 max-h-[280px] overflow-y-auto md:right-0 md:left-auto">
          <MenuItem className="bucket-option" selected={!item.bucket} onClick={() => pick(null)}>
            Unsorted
          </MenuItem>
          {buckets.map((b) => (
            <MenuItem key={b.id} className="bucket-option" selected={item.bucket?.id === b.id} onClick={() => pick(b.id)}>
              {b.name}
            </MenuItem>
          ))}
          <div className="my-1 h-px bg-cream-dark md:hidden" />
          <MenuItem className="delete-option md:hidden" danger icon={<IconTrash size={14} />} onClick={() => { setOpen(false); onDelete(); }}>
            Delete link
          </MenuItem>
        </Menu>
      )}
    </div>
  );
}
