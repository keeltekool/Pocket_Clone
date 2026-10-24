"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { sameView, type BucketRow, type Prefill, type View } from "./types";
import { Count, IconDots, IconPencil, IconTrash, Menu, MenuItem, useDismiss } from "./ui";

export type NavProps = {
  buckets: BucketRow[];
  counts: { all: number; unsorted: number; bucket: (id: string) => number };
  view: View;
  onView: (v: View) => void;
  onCreate: (name: string, suggestionId: string | null) => Promise<string | null>;
  onRename: (b: BucketRow) => void;
  onDelete: (b: BucketRow) => void;
  /** From a suggestion's Create bucket: pre-fills the new-bucket field of the named target. */
  prefill: Prefill | null;
  /** The field closed (created or cancelled): the prefill is spent. */
  onPrefillDone: () => void;
};

export const viewName = (view: View, buckets: BucketRow[]) =>
  view.kind === "all" ? "All links" : view.kind === "unsorted" ? "Unsorted" : buckets.find((b) => b.id === view.id)?.name ?? "All links";

// Desktop sidebar (SPEC §3): All links · Unsorted · BUCKETS with counts and a ⋮ menu · + New bucket.
export function Sidebar(p: NavProps) {
  return (
    <nav aria-label="Buckets">
      <NavItem label="All links" count={p.counts.all} active={p.view.kind === "all"} onClick={() => p.onView({ kind: "all" })} view="all" />
      <NavItem label="Unsorted" count={p.counts.unsorted} active={p.view.kind === "unsorted"} onClick={() => p.onView({ kind: "unsorted" })} view="unsorted" />
      <div className="mx-4 my-2 h-px bg-cream-dark" />
      <div className="px-4 pt-4 pb-2 text-overline uppercase text-ink-faint">Buckets</div>
      {p.buckets.map((b) => (
        <BucketRowItem key={b.id} bucket={b} {...p} />
      ))}
      <NewBucket idPrefix="new-bucket" onCreate={p.onCreate} prefill={p.prefill?.target === "sidebar" ? p.prefill : null} onDone={p.onPrefillDone} />
    </nav>
  );
}

function NavItem({ label, count, active, onClick, view, children }: { label: string; count: number; active: boolean; onClick: () => void; view: string; children?: React.ReactNode }) {
  return (
    <div className={`group relative flex items-center rounded-sm transition-all duration-150 ease-out hover:bg-terracotta-glow ${active ? "bg-terracotta-pale" : ""}`}>
      <button
        type="button"
        data-view={view}
        onClick={onClick}
        className={`sidebar-item flex min-w-0 flex-1 cursor-pointer items-center px-4 py-2 text-left text-label transition-colors duration-150 ${active ? "font-semibold text-terracotta" : "text-ink-soft"}`}
      >
        <span className="bucket-name flex-1 truncate">{label}</span>
        <Count>{count}</Count>
      </button>
      {children}
    </div>
  );
}

function BucketRowItem({ bucket, counts, view, onView, onRename, onDelete }: NavProps & { bucket: BucketRow }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const active = sameView(view, { kind: "bucket", id: bucket.id });
  return (
    <NavItem label={bucket.name} count={counts.bucket(bucket.id)} active={active} onClick={() => onView({ kind: "bucket", id: bucket.id })} view={bucket.id}>
      <div ref={ref} className="relative">
        {/* Hover-only on pointers; always visible on touch (SPEC §10). */}
        <button
          type="button"
          title="Options"
          aria-label={`Options for ${bucket.name}`}
          onClick={() => setOpen((o) => !o)}
          className={`bucket-menu-btn mr-1 flex cursor-pointer items-center justify-center rounded-sm p-1 text-ink-muted transition-all duration-150 hover:bg-cream-dark hover:text-ink group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${open ? "opacity-100" : "opacity-0"}`}
        >
          <IconDots />
        </button>
        {open && (
          <Menu id="bucket-context-menu" className="absolute top-full right-0 min-w-menu">
            <MenuItem icon={<IconPencil />} onClick={() => { setOpen(false); onRename(bucket); }}>
              Rename
            </MenuItem>
            <MenuItem icon={<IconTrash size={14} />} danger onClick={() => { setOpen(false); onDelete(bucket); }}>
              Delete
            </MenuItem>
          </Menu>
        )}
      </div>
    </NavItem>
  );
}

// Dashed "+ New bucket" row → inline name field; Enter creates, Escape cancels. Shared by the sidebar and the sheet.
export function NewBucket({ idPrefix, onCreate, prefill, onDone }: {
  idPrefix: string;
  onCreate: (name: string, suggestionId: string | null) => Promise<string | null>;
  prefill: Prefill | null;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nonce = prefill?.nonce;

  // A suggestion's Create bucket opens the field with the name in it; the owner can edit, Enter creates.
  // Keyed on the nonce so a second click after a cancel opens it again.
  useEffect(() => {
    if (prefill && nonce) {
      setName(prefill.name);
      setEditing(true);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  function close() {
    setEditing(false);
    setName("");
    setError(null);
    if (prefill) onDone();
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    const err = await onCreate(n, prefill?.suggestionId ?? null);
    setBusy(false);
    if (err) return setError(err);
    close();
  }

  if (!editing)
    return (
      <div className="mt-2 px-4">
        <button
          id={`${idPrefix}-btn`}
          type="button"
          onClick={() => setEditing(true)}
          className="w-full cursor-pointer rounded-sm border-[1.5px] border-dashed border-cream-dark bg-transparent px-4 py-2 text-left text-small text-ink-muted transition-all duration-150 ease-out hover:border-terracotta-soft hover:bg-terracotta-glow hover:text-terracotta"
        >
          + New bucket
        </button>
      </div>
    );
  return (
    <form id={`${idPrefix}-form`} onSubmit={submit} className="mt-2 px-4">
      <input
        id={`${idPrefix}-input`}
        autoFocus
        maxLength={60}
        placeholder="Bucket name…"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(null); }}
        onKeyDown={(e) => e.key === "Escape" && close()}
        onBlur={() => !name.trim() && close()}
        className="w-full rounded-sm border-[1.5px] border-terracotta-soft bg-warm-white px-3 py-2 text-small text-ink outline-none ring-4 ring-terracotta-glow placeholder:text-ink-faint"
      />
      {error && <p className="mt-1 px-1 text-micro text-danger">{error}</p>}
      <p className="mt-1 px-1 text-micro text-ink-faint">Enter to create · Esc to cancel</p>
    </form>
  );
}
