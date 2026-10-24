"use client";
import { useEffect, useState } from "react";
import { NewBucket, type NavProps } from "./Sidebar";
import { sameView, type BucketRow, type View } from "./types";
import { Count, IconClose, IconDots, IconPencil, IconTrash, Menu, MenuItem } from "./ui";

// Phone filter (SPEC §4.5): bottom sheet "Filter by bucket" with All links, Unsorted and the buckets; tap selects and
// closes. Bucket ⋮ and + New bucket live here too, since phones have no sidebar.
export function MobileSheet({ open, onClose, buckets, counts, view, onView, onCreate, onRename, onDelete, prefill }: NavProps & { open: boolean; onClose: () => void }) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setMenuFor(null);
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
    };
  }, [open, onClose]);

  const row = (label: string, count: number, v: View, bucket?: BucketRow) => {
    const active = sameView(view, v);
    return (
      <div key={bucket?.id ?? v.kind} className={`flex items-center rounded-md transition-all duration-150 ${active ? "bg-terracotta-pale" : "hover:bg-cream"}`}>
        <button
          type="button"
          onClick={() => onView(v)}
          className={`sheet-item flex min-w-0 flex-1 cursor-pointer items-center justify-between p-4 text-left text-body ${active ? "font-semibold text-terracotta" : "text-ink"}`}
        >
          <span className="truncate">{label}</span>
          <Count>{count}</Count>
        </button>
        {bucket && (
          <div className="relative mr-2">
            <button
              type="button"
              aria-label={`Options for ${bucket.name}`}
              onClick={() => setMenuFor(menuFor === bucket.id ? null : bucket.id)}
              className="bucket-menu-btn flex cursor-pointer items-center justify-center rounded-sm p-2 text-ink-muted hover:bg-cream-dark hover:text-ink"
            >
              <IconDots />
            </button>
            {menuFor === bucket.id && (
              <Menu className="absolute top-full right-0 min-w-menu">
                <MenuItem icon={<IconPencil />} onClick={() => { setMenuFor(null); onRename(bucket); }}>
                  Rename
                </MenuItem>
                <MenuItem icon={<IconTrash size={14} />} danger onClick={() => { setMenuFor(null); onDelete(bucket); }}>
                  Delete
                </MenuItem>
              </Menu>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="mobile-sheet" data-open={open || undefined} className={`fixed inset-0 z-40 transition-opacity duration-300 md:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
      <div className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Filter by bucket"
        className={`absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-lg bg-warm-white transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex items-center justify-between border-b border-cream-dark p-5">
          <h3 className="font-display text-subheading text-ink">Filter by bucket</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="sheet-close flex size-8 cursor-pointer items-center justify-center rounded-full bg-cream text-ink-muted transition-all duration-150 hover:bg-cream-dark hover:text-ink"
          >
            <IconClose />
          </button>
        </div>
        <div className="max-h-[calc(80vh-72px)] overflow-y-auto p-3 pb-8">
          {row("All links", counts.all, { kind: "all" })}
          {row("Unsorted", counts.unsorted, { kind: "unsorted" })}
          <div className="mx-4 my-2 h-px bg-cream-dark" />
          {buckets.map((b) => row(b.name, counts.bucket(b.id), { kind: "bucket", id: b.id }, b))}
          <NewBucket onCreate={onCreate} prefill={open ? prefill : null} />
        </div>
      </div>
    </div>
  );
}
